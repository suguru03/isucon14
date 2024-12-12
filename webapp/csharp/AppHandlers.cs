using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;

public static class AppHandlers
{
  private class AppPostUsersRequest
  {
    [JsonPropertyName("username")] public string Username { get; init; } = string.Empty;
    [JsonPropertyName("firstname")] public string FirstName { get; init; } = string.Empty;
    [JsonPropertyName("lastname")] public string LastName { get; init; } = string.Empty;
    [JsonPropertyName("date_of_birth")] public string DateOfBirth { get; init; } = string.Empty;
    [JsonPropertyName("invitation_code")] public string? InvitationCode { get; init; }
  }


  private class AppPostUsersResponse
  {
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("invitation_code")] public string InvitationCode { get; init; } = string.Empty;
  }

  public static async Task AppPostUsersAsync(HttpContext context, IDbConnection db)
  {
    var request = await JsonSerializer.DeserializeAsync<AppPostUsersRequest>(context.Request.Body);
    if (request == null || string.IsNullOrEmpty(request.Username) ||
        string.IsNullOrEmpty(request.FirstName) ||
        string.IsNullOrEmpty(request.LastName) ||
        string.IsNullOrEmpty(request.DateOfBirth))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest,
        "required fields(username, firstname, lastname, date_of_birth) are empty");
      return;
    }

    var userId = Ulid.NewUlid().ToString();
    var accessToken = Utils.SecureRandomStr(32);
    var invitationCode = Utils.SecureRandomStr(15);

    using var transaction = db.BeginTransaction();
    try
    {
      // データベース操作
      await db.ExecuteAsync(
        "INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token, invitation_code) VALUES (@UserID, @Username, @FirstName, @LastName, @DateOfBirth, @AccessToken, @InvitationCode)",
        new
        {
          UserID = userId, request.Username, request.FirstName, request.LastName, request.DateOfBirth,
          AccessToken = accessToken, InvitationCode = invitationCode
        },
        transaction
      );

      await db.ExecuteAsync(
        "INSERT INTO coupons (user_id, code, discount) VALUES (@UserID, @Code, @Discount)",
        new { UserID = userId, Code = "CP_NEW2024", Discount = 3000 },
        transaction
      );

      if (!string.IsNullOrEmpty(request.InvitationCode))
      {
        var inviter = await db.QueryFirstOrDefaultAsync<User>(
          "SELECT * FROM users WHERE invitation_code = @InvitationCode",
          new { request.InvitationCode },
          transaction
        );

        if (inviter == null)
        {
          await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "この招待コードは使用できません。");
          transaction.Rollback();
          return;
        }

        await db.ExecuteAsync(
          "INSERT INTO coupons (user_id, code, discount) VALUES (@UserID, @Code, @Discount)",
          new { UserID = userId, Code = "INV_" + request.InvitationCode, Discount = 1500 },
          transaction
        );

        await db.ExecuteAsync(
          "INSERT INTO coupons (user_id, code, discount) VALUES (@UserID, CONCAT(@CodePrefix, '_', FLOOR(UNIX_TIMESTAMP(NOW(3))*1000)), @Discount)",
          new { UserID = inviter.ID, CodePrefix = "RWD_" + request.InvitationCode, Discount = 1000 },
          transaction
        );
      }

      transaction.Commit();

      context.Response.Cookies.Append("app_session", accessToken);

      await Request.WriteJsonAsync(context, new AppPostUsersResponse
      {
        Id = userId,
        InvitationCode = invitationCode
      }, StatusCodes.Status201Created);
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex.Message);
    }
  }

  public class AppPostPaymentMethodsRequest
  {
    [JsonPropertyName("token")] public string Token { get; init; } = string.Empty;
  }

  public static async Task AppPostPaymentMethodsAsync(HttpContext context, IDbConnection db)
  {
    var request = await JsonSerializer.DeserializeAsync<AppPostPaymentMethodsRequest>(context.Request.Body);
    if (request == null || string.IsNullOrEmpty(request.Token))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "token is required but was empty");
      return;
    }

    if (context.Items["user"] is not User user)
    {
      throw new Exception("USER NOT FOUND!");
    }

    try
    {
      await db.ExecuteAsync(
        "INSERT INTO payment_tokens (user_id, token) VALUES (@UserID, @Token)",
        new { UserID = user.ID, request.Token }
      );

      context.Response.StatusCode = StatusCodes.Status204NoContent;
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private class GetAppRidesResponse
  {
    [JsonPropertyName("rides")] public List<GetAppRidesResponseItem> Rides { get; set; } = [];
  }

  private class GetAppRidesResponseItem
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("pickup_coordinate")]
    public Coordinate PickupCoordinate { get; set; } = new();

    [JsonPropertyName("destination_coordinate")]
    public Coordinate DestinationCoordinate { get; set; } = new();

    [JsonPropertyName("chair")] public GetAppRidesResponseItemChair Chair { get; init; } = new();

    [JsonPropertyName("fare")] public int Fare { get; set; }

    [JsonPropertyName("evaluation")] public int Evaluation { get; set; }

    [JsonPropertyName("requested_at")] public long RequestedAt { get; set; }

    [JsonPropertyName("completed_at")] public long CompletedAt { get; set; }
  }

  private class GetAppRidesResponseItemChair
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("owner")] public string Owner { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;
  }

  public static async Task AppGetRidesAsync(HttpContext context, IDbConnection db)
  {
    if (context.Items["user"] is not User user)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "User not authenticated.");
      return;
    }

    using var transaction = db.BeginTransaction();

    try
    {
      var rides = await db.QueryAsync<Ride>(
        "SELECT * FROM rides WHERE user_id = @UserID ORDER BY created_at DESC",
        new { UserID = user.ID },
        transaction
      );

      var items = new List<GetAppRidesResponseItem>();

      foreach (var ride in rides)
      {
        var status = await GetLatestRideStatusAsync(transaction, ride.ID);
        if (status != "COMPLETED")
        {
          continue;
        }

        var fare = await CalculateDiscountedFareAsync(
          transaction,
          user.ID,
          ride,
          ride.PickupLatitude,
          ride.PickupLongitude,
          ride.DestinationLatitude,
          ride.DestinationLongitude
        );
        var item = new GetAppRidesResponseItem
        {
          Id = ride.ID,
          PickupCoordinate = new Coordinate { Latitude = ride.PickupLatitude, Longitude = ride.PickupLongitude },
          DestinationCoordinate = new Coordinate
            { Latitude = ride.DestinationLatitude, Longitude = ride.DestinationLongitude },
          Fare = fare,
          Evaluation = ride.Evaluation ?? 0,
          RequestedAt = ride.CreatedAt.ToUnixTimeMilliseconds(),
          CompletedAt = ride.UpdatedAt.ToUnixTimeMilliseconds(),
          Chair = new GetAppRidesResponseItemChair()
        };

        var chair = await db.QueryFirstOrDefaultAsync<Chair>(
          "SELECT * FROM chairs WHERE id = @ChairID",
          new { ride.ChairID },
          transaction
        );
        if (chair != null)
        {
          item.Chair.Id = chair.ID;
          item.Chair.Name = chair.Name;
          item.Chair.Model = chair.Model;

          var owner = await db.QueryFirstOrDefaultAsync<Owner>(
            "SELECT * FROM owners WHERE id = @OwnerID",
            new { chair.OwnerID },
            transaction
          );

          if (owner != null)
          {
            item.Chair.Owner = owner.Name;
          }
        }

        items.Add(item);
      }

      transaction.Commit();

      await Request.WriteJsonAsync(context, new GetAppRidesResponse { Rides = items });
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static Task<string> GetLatestRideStatusAsync(IDbTransaction transaction, string rideId)
  {
    return transaction.Connection!.QueryFirstAsync<string>(
      "SELECT status FROM ride_statuses WHERE ride_id = @RideID ORDER BY created_at DESC LIMIT 1",
      new { RideID = rideId },
      transaction
    );
  }

  private static async Task<int> CalculateDiscountedFareAsync(
    IDbTransaction transaction,
    string userId,
    Ride? ride,
    int pickupLatitude,
    int pickupLongitude,
    int destLatitude,
    int destLongitude)
  {
    const int farePerDistance = 100;
    const int initialFare = 500;

    var connection = transaction.Connection;

    var discount = 0;

    if (ride != null)
    {
      destLatitude = ride.DestinationLatitude;
      destLongitude = ride.DestinationLongitude;
      pickupLatitude = ride.PickupLatitude;
      pickupLongitude = ride.PickupLongitude;

      var rideCoupon = await connection!.QueryFirstOrDefaultAsync<Coupon>(
        "SELECT * FROM coupons WHERE used_by = @RideID",
        new { RideID = ride.ID },
        transaction
      );
      if (rideCoupon != null)
      {
        discount = rideCoupon.Discount;
      }
    }
    else
    {
      // 初回利用クーポンを最優先で使用
      var firstTimeCoupon = await connection.QueryFirstOrDefaultAsync<Coupon>(
        "SELECT * FROM coupons WHERE user_id = @UserID AND code = 'CP_NEW2024' AND used_by IS NULL",
        new { UserID = userId },
        transaction
      );

      if (firstTimeCoupon != null)
      {
        discount = firstTimeCoupon.Discount;
      }
      else
      {
        // 他のクーポンを使用（付与された順に）
        var otherCoupon = await connection.QueryFirstOrDefaultAsync<Coupon>(
          "SELECT * FROM coupons WHERE user_id = @UserID AND used_by IS NULL ORDER BY created_at LIMIT 1",
          new { UserID = userId },
          transaction
        );

        if (otherCoupon != null)
        {
          discount = otherCoupon.Discount;
        }
      }
    }

    // 距離計算
    var meteredFare = farePerDistance *
                      CalculateDistance(pickupLatitude, pickupLongitude, destLatitude, destLongitude);

    // 割引適用後の料金
    var discountedMeteredFare = Math.Max(meteredFare - discount, 0);

    // 総料金
    return initialFare + discountedMeteredFare;
  }

  private static int CalculateDistance(int aLatitude, int aLongitude, int bLatitude, int bLongitude)
  {
    return Math.Abs(aLatitude - bLatitude) + Math.Abs(aLongitude - bLongitude);
  }

  private class AppPostRidesRequest
  {
    [JsonPropertyName("pickup_coordinate")]
    public Coordinate PickupCoordinate { get; init; } = new();

    [JsonPropertyName("destination_coordinate")]
    public Coordinate DestinationCoordinate { get; init; } = new();
  }

  private class AppPostRidesResponse
  {
    [JsonPropertyName("ride_id")] public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("fare")] public int Fare { get; set; }
  }

  public static async Task AppPostRidesAsync(HttpContext context, IDbConnection db)
  {
    var request = await JsonSerializer.DeserializeAsync<AppPostRidesRequest>(context.Request.Body);
    if (request == null || request.PickupCoordinate == null || request.DestinationCoordinate == null)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest,
        "required fields (pickup_coordinate, destination_coordinate) are empty");
      return;
    }

    var user = context.Items["user"] as User;
    if (user == null)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "User not authenticated.");
      return;
    }

    var rideId = Ulid.NewUlid().ToString();

    using var transaction = db.BeginTransaction();

    try
    {
      var rides = await db.QueryAsync<Ride>(
        "SELECT * FROM rides WHERE user_id = @UserID",
        new { UserID = user.ID },
        transaction
      );

      var continuingRideCount = 0;
      foreach (var r in rides)
      {
        var status = await GetLatestRideStatusAsync(transaction, r.ID);
        if (status != "COMPLETED")
        {
          continuingRideCount++;
        }
      }

      if (continuingRideCount > 0)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status409Conflict, "ride already exists");
        return;
      }

      await db.ExecuteAsync(
        "INSERT INTO rides (id, user_id, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude) " +
        "VALUES (@RideID, @UserID, @PickupLatitude, @PickupLongitude, @DestinationLatitude, @DestinationLongitude)",
        new
        {
          RideID = rideId,
          UserID = user.ID,
          PickupLatitude = request.PickupCoordinate.Latitude,
          PickupLongitude = request.PickupCoordinate.Longitude,
          DestinationLatitude = request.DestinationCoordinate.Latitude,
          DestinationLongitude = request.DestinationCoordinate.Longitude
        },
        transaction
      );

      await db.ExecuteAsync(
        "INSERT INTO ride_statuses (id, ride_id, status) VALUES (@StatusID, @RideID, @Status)",
        new
        {
          StatusID = Ulid.NewUlid().ToString(),
          RideID = rideId,
          Status = "MATCHING"
        },
        transaction
      );

      var rideCount = await db.QueryFirstOrDefaultAsync<int>(
        "SELECT COUNT(*) FROM rides WHERE user_id = @UserID",
        new { UserID = user.ID },
        transaction
      );

      if (rideCount == 1)
      {
        await UseFirstAvailableCouponAsync(transaction, user.ID, rideId, "CP_NEW2024");
      }
      else
      {
        await UseFirstAvailableCouponAsync(transaction, user.ID, rideId);
      }

      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE id = @RideID",
        new { RideID = rideId },
        transaction
      );

      if (ride == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError,
          "Ride not found after insertion.");
        return;
      }

      var fare = await CalculateDiscountedFareAsync(
        transaction,
        user.ID,
        ride,
        request.PickupCoordinate.Latitude,
        request.PickupCoordinate.Longitude,
        request.DestinationCoordinate.Latitude,
        request.DestinationCoordinate.Longitude
      );

      transaction.Commit();

      await Request.WriteJsonAsync(context, new AppPostRidesResponse
      {
        RideId = rideId,
        Fare = fare
      }, StatusCodes.Status202Accepted);
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static async Task UseFirstAvailableCouponAsync(IDbTransaction transaction, string userId,
    string rideId, string? specificCode = null)
  {
    var connection = transaction.Connection!;
    var coupon = new Coupon();

    if (!string.IsNullOrEmpty(specificCode))
    {
      coupon = await connection.QueryFirstOrDefaultAsync<Coupon>(
        "SELECT * FROM coupons WHERE user_id = @UserID AND code = @Code AND used_by IS NULL FOR UPDATE",
        new { UserID = userId, Code = specificCode },
        transaction
      );
    }

    coupon ??= await connection.QueryFirstOrDefaultAsync<Coupon>(
      "SELECT * FROM coupons WHERE user_id = @UserID AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE",
      new { UserID = userId },
      transaction
    );

    if (coupon != null)
    {
      await connection.ExecuteAsync(
        "UPDATE coupons SET used_by = @RideID WHERE user_id = @UserID AND code = @CouponCode",
        new { RideID = rideId, UserID = userId, CouponCode = coupon.Code },
        transaction
      );
    }
  }

  private class AppPostRidesEstimatedFareRequest
  {
    [JsonPropertyName("pickup_coordinate")]
    public Coordinate? PickupCoordinate { get; init; }

    [JsonPropertyName("destination_coordinate")]
    public Coordinate? DestinationCoordinate { get; init; }
  }

  private class AppPostRidesEstimatedFareResponse
  {
    [JsonPropertyName("fare")] public int Fare { get; set; }

    [JsonPropertyName("discount")] public int Discount { get; set; }
  }

  public static async Task AppPostRidesEstimatedFareAsync(HttpContext context, IDbConnection db)
  {
    var request = await JsonSerializer.DeserializeAsync<AppPostRidesEstimatedFareRequest>(context.Request.Body);
    if (request?.PickupCoordinate == null || request.DestinationCoordinate == null)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest,
        "required fields (pickup_coordinate, destination_coordinate) are empty");
      return;
    }

    if (context.Items["user"] is not User user)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "User not authenticated.");
      return;
    }

    using var transaction = db.BeginTransaction();

    try
    {
      // 割引後の運賃を計算
      var discountedFare = await CalculateDiscountedFareAsync(
        transaction,
        user.ID,
        null,
        request.PickupCoordinate.Latitude,
        request.PickupCoordinate.Longitude,
        request.DestinationCoordinate.Latitude,
        request.DestinationCoordinate.Longitude
      );

      // 割引前の運賃を計算
      var fullFare = CalculateFare(
        request.PickupCoordinate.Latitude,
        request.PickupCoordinate.Longitude,
        request.DestinationCoordinate.Latitude,
        request.DestinationCoordinate.Longitude
      );

      transaction.Commit();

      // レスポンスを送信
      await Request.WriteJsonAsync(context, new AppPostRidesEstimatedFareResponse
      {
        Fare = discountedFare,
        Discount = fullFare - discountedFare
      });
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static int CalculateFare(int pickupLatitude, int pickupLongitude, int destLatitude, int destLongitude)
  {
    const int initialFare = 500; // 初乗り料金
    const int farePerDistance = 100; // 距離あたりの料金

    // 距離を計算
    var meteredFare = farePerDistance * CalculateDistance(pickupLatitude, pickupLongitude, destLatitude, destLongitude);

    return initialFare + meteredFare;
  }

  private class AppPostRideEvaluationRequest
  {
    [JsonPropertyName("evaluation")] public int Evaluation { get; set; }
  }

  private class AppPostRideEvaluationResponse
  {
    [JsonPropertyName("completed_at")] public long CompletedAt { get; set; }
  }

  public static async Task AppPostRideEvaluationAsync(HttpContext context, IDbConnection db)
  {
    var rideId = context.Request.RouteValues["ride_id"]?.ToString();
    if (string.IsNullOrEmpty(rideId))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Ride ID is required.");
      return;
    }

    var request = await JsonSerializer.DeserializeAsync<AppPostRideEvaluationRequest>(context.Request.Body);
    if (request == null || request.Evaluation < 1 || request.Evaluation > 5)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Evaluation must be between 1 and 5.");
      return;
    }

    using var transaction = db.BeginTransaction();
    try
    {
      // ライド情報を取得
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE id = @RideID",
        new { RideID = rideId },
        transaction
      );

      if (ride == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status404NotFound, "Ride not found.");
        return;
      }

      var status = await GetLatestRideStatusAsync(transaction, ride.ID);
      if (status != "ARRIVED")
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Not arrived yet.");
        return;
      }

      // 評価を更新
      var result = await db.ExecuteAsync(
        "UPDATE rides SET evaluation = @Evaluation WHERE id = @RideID",
        new { Evaluation = request.Evaluation, RideID = rideId },
        transaction
      );

      if (result == 0)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status404NotFound, "Ride not found during update.");
        return;
      }

      // ステータスを "COMPLETED" に設定
      await db.ExecuteAsync(
        "INSERT INTO ride_statuses (id, ride_id, status) VALUES (@StatusID, @RideID, @Status)",
        new { StatusID = Ulid.NewUlid().ToString(), RideID = rideId, Status = "COMPLETED" },
        transaction
      );

      // 支払い処理
      var paymentToken = await db.QueryFirstOrDefaultAsync<PaymentToken>(
        "SELECT * FROM payment_tokens WHERE user_id = @UserID",
        new { ride.UserID },
        transaction
      );

      if (paymentToken == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Payment token not registered.");
        return;
      }

      var fare = await CalculateDiscountedFareAsync(
        transaction,
        ride.UserID,
        ride,
        ride.PickupLatitude,
        ride.PickupLongitude,
        ride.DestinationLatitude,
        ride.DestinationLongitude
      );

      var paymentGatewayURL = await db.QueryFirstOrDefaultAsync<string>(
        "SELECT value FROM settings WHERE name = 'payment_gateway_url'",
        transaction: transaction
      );

      if (string.IsNullOrEmpty(paymentGatewayURL))
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError,
          "Payment gateway URL not found.");
        return;
      }

      ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE id = @RideID",
        new { RideID = rideId },
        transaction
      );
      if (ride == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status404NotFound, "Ride not found.");
        return;
      }

      await PaymentGateway.RequestPaymentGatewayPostPaymentAsync(
        paymentGatewayURL,
        paymentToken.Token,
        new PaymentGateway.PaymentGatewayPostPaymentRequest
        {
          Amount = fare
        },
        async () =>
        {
          // ライド情報を取得するデリゲートの実装
          var rides = await db.QueryAsync<Ride>(
            "SELECT * FROM rides WHERE user_id = @UserID ORDER BY created_at ASC",
            new { ride.UserID },
            transaction
          );
          return rides.ToList();
        }
      );

      // コミット
      transaction.Commit();

      // レスポンス
      await Request.WriteJsonAsync(context, new AppPostRideEvaluationResponse
      {
        CompletedAt = ride.UpdatedAt.ToUnixTimeMilliseconds()
      });
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private class AppGetNotificationResponse
  {
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("data")]
    public AppGetNotificationResponseData? Data { get; init; }

    [JsonPropertyName("retry_after_ms")] public int RetryAfterMs { get; set; }
  }

  private class AppGetNotificationResponseData
  {
    [JsonPropertyName("ride_id")] public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("pickup_coordinate")]
    public Coordinate PickupCoordinate { get; set; } = new();

    [JsonPropertyName("destination_coordinate")]
    public Coordinate DestinationCoordinate { get; set; } = new();

    [JsonPropertyName("fare")] public int Fare { get; set; }

    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("chair")]
    public AppGetNotificationResponseChair? Chair { get; set; }

    [JsonPropertyName("created_at")] public long CreatedAt { get; set; }

    [JsonPropertyName("update_at")] public long UpdateAt { get; set; }
  }

  private class AppGetNotificationResponseChair
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("stats")] public AppGetNotificationResponseChairStats Stats { get; set; } = new();
  }

  private class AppGetNotificationResponseChairStats
  {
    [JsonPropertyName("total_rides_count")]
    public int TotalRidesCount { get; set; }

    [JsonPropertyName("total_evaluation_avg")]
    public double TotalEvaluationAvg { get; set; }
  }

  public static async Task AppGetNotificationAsync(HttpContext context, IDbConnection db)
  {
    if (context.Items["user"] is not User user)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "User not authenticated.");
      return;
    }

    using var transaction = db.BeginTransaction();
    try
    {
      // 最新のライドを取得
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE user_id = @UserID ORDER BY created_at DESC LIMIT 1",
        new { UserID = user.ID },
        transaction
      );

      if (ride == null)
      {
        await Request.WriteJsonAsync(context, new AppGetNotificationResponse
        {
          RetryAfterMs = 30
        });
        return;
      }

      var rideStatus = await db.QueryFirstOrDefaultAsync<RideStatus>(
        "SELECT * FROM ride_statuses WHERE ride_id = @RideID AND app_sent_at IS NULL ORDER BY created_at ASC LIMIT 1",
        new { RideID = ride.ID },
        transaction
      );

      string status;
      if (rideStatus != null)
      {
        status = rideStatus.Status;
      }
      else
      {
        status = await GetLatestRideStatusAsync(transaction, ride.ID);
      }

      var fare = await CalculateDiscountedFareAsync(
        transaction,
        user.ID,
        ride,
        ride.PickupLatitude,
        ride.PickupLongitude,
        ride.DestinationLatitude,
        ride.DestinationLongitude
      );

      var response = new AppGetNotificationResponse
      {
        Data = new AppGetNotificationResponseData
        {
          RideId = ride.ID,
          PickupCoordinate = new Coordinate
          {
            Latitude = ride.PickupLatitude,
            Longitude = ride.PickupLongitude
          },
          DestinationCoordinate = new Coordinate
          {
            Latitude = ride.DestinationLatitude,
            Longitude = ride.DestinationLongitude
          },
          Fare = fare,
          Status = status,
          CreatedAt = ride.CreatedAt.ToUnixTimeMilliseconds(),
          UpdateAt = ride.UpdatedAt.ToUnixTimeMilliseconds()
        },
        RetryAfterMs = 30
      };

      if (ride.ChairID != null)
      {
        var chair = await db.QueryFirstOrDefaultAsync<Chair>(
          "SELECT * FROM chairs WHERE id = @ChairID",
          new { ride.ChairID },
          transaction
        );

        if (chair != null)
        {
          var stats = await GetChairStatsAsync(transaction, chair.ID);

          response.Data.Chair = new AppGetNotificationResponseChair
          {
            Id = chair.ID,
            Name = chair.Name,
            Model = chair.Model,
            Stats = stats
          };
        }
      }

      if (rideStatus != null)
      {
        await db.ExecuteAsync(
          "UPDATE ride_statuses SET app_sent_at = CURRENT_TIMESTAMP(6) WHERE id = @StatusID",
          new { StatusID = rideStatus.ID },
          transaction
        );
      }

      transaction.Commit();
      await Request.WriteJsonAsync(context, response);
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static async Task<AppGetNotificationResponseChairStats> GetChairStatsAsync(IDbTransaction transaction,
    string chairId)
  {
    var stats = new AppGetNotificationResponseChairStats();

    var rides = await transaction.Connection.QueryAsync<Ride>(
      "SELECT * FROM rides WHERE chair_id = @ChairID ORDER BY updated_at DESC",
      new { ChairID = chairId },
      transaction
    );

    int totalRideCount = 0;
    double totalEvaluation = 0;

    foreach (var ride in rides)
    {
      var rideStatuses = await transaction.Connection.QueryAsync<RideStatus>(
        "SELECT * FROM ride_statuses WHERE ride_id = @RideID ORDER BY created_at",
        new { RideID = ride.ID },
        transaction
      );

      var isCompleted = false;
      DateTime? arrivedAt = null;
      DateTime? pickedUpAt = null;

      foreach (var status in rideStatuses)
      {
        if (status.Status == "ARRIVED")
        {
          arrivedAt = status.CreatedAt;
        }
        else if (status.Status == "CARRYING")
        {
          pickedUpAt = status.CreatedAt;
        }
        else if (status.Status == "COMPLETED")
        {
          isCompleted = true;
        }
      }

      if (!arrivedAt.HasValue || !pickedUpAt.HasValue || !isCompleted)
      {
        continue;
      }

      totalRideCount++;
      if (ride.Evaluation.HasValue)
      {
        totalEvaluation += ride.Evaluation.Value;
      }
    }

    stats.TotalRidesCount = totalRideCount;
    stats.TotalEvaluationAvg = totalRideCount > 0 ? totalEvaluation / totalRideCount : 0;

    return stats;
  }


  private class AppGetNearbyChairsResponse
  {
    [JsonPropertyName("chairs")] public List<AppGetNearbyChairsResponseChair> Chairs { get; init; } = [];

    [JsonPropertyName("retrieved_at")] public long RetrievedAt { get; init; }
  }

  private class AppGetNearbyChairsResponseChair
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("current_coordinate")]
    public Coordinate CurrentCoordinate { get; set; } = new();
  }

  public static async Task AppGetNearbyChairsAsync(HttpContext context, IDbConnection db)
  {
    var latStr = context.Request.Query["latitude"];
    var lonStr = context.Request.Query["longitude"];
    var distanceStr = context.Request.Query["distance"];

    if (string.IsNullOrEmpty(latStr) || string.IsNullOrEmpty(lonStr))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Latitude or longitude is empty.");
      return;
    }

    if (!int.TryParse(latStr, out var latitude))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Latitude is invalid.");
      return;
    }

    if (!int.TryParse(lonStr, out var longitude))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Longitude is invalid.");
      return;
    }

    var distance = 50; // Default distance
    if (!string.IsNullOrEmpty(distanceStr) && !int.TryParse(distanceStr, out distance))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Distance is invalid.");
      return;
    }

    var coordinate = new Coordinate { Latitude = latitude, Longitude = longitude };

    using var transaction = db.BeginTransaction();
    try
    {
      var chairs = await db.QueryAsync<Chair>("SELECT * FROM chairs", transaction);

      var nearbyChairs = new List<AppGetNearbyChairsResponseChair>();

      foreach (var chair in chairs)
      {
        if (!chair.IsActive)
          continue;

        var rides = await db.QueryAsync<Ride>(
          "SELECT * FROM rides WHERE chair_id = @ChairID ORDER BY created_at DESC",
          new { ChairID = chair.ID },
          transaction
        );

        var skip = false;
        foreach (var ride in rides)
        {
          var status = await GetLatestRideStatusAsync(transaction, ride.ID);
          if (status != "COMPLETED")
          {
            skip = true;
            break;
          }
        }

        if (skip)
          continue;

        var chairLocation = await db.QueryFirstOrDefaultAsync<ChairLocation>(
          "SELECT * FROM chair_locations WHERE chair_id = @ChairID ORDER BY created_at DESC LIMIT 1",
          new { ChairID = chair.ID },
          transaction
        );

        if (chairLocation == null)
          continue;

        if (CalculateDistance(coordinate.Latitude, coordinate.Longitude, chairLocation.Latitude,
              chairLocation.Longitude) <= distance)
        {
          nearbyChairs.Add(new AppGetNearbyChairsResponseChair
          {
            Id = chair.ID,
            Name = chair.Name,
            Model = chair.Model,
            CurrentCoordinate = new Coordinate
            {
              Latitude = chairLocation.Latitude,
              Longitude = chairLocation.Longitude
            }
          });
        }
      }

      var retrievedAt = await db.QueryFirstOrDefaultAsync<DateTime>(
        "SELECT CURRENT_TIMESTAMP(6)",
        transaction
      );

      await Request.WriteJsonAsync(context, new AppGetNearbyChairsResponse
      {
        Chairs = nearbyChairs,
        RetrievedAt = new DateTimeOffset(retrievedAt).ToUnixTimeMilliseconds()
      });
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }
}
