using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;

public static class ChairHandlers
{
  private class ChairPostChairsRequest
  {
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;

    [JsonPropertyName("model")] public string Model { get; init; } = string.Empty;

    [JsonPropertyName("chair_register_token")]
    public string ChairRegisterToken { get; init; } = string.Empty;
  }

  private class ChairPostChairsResponse
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("owner_id")] public string OwnerId { get; set; } = string.Empty;
  }

  public static async Task ChairPostChairsAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      var request = await JsonSerializer.DeserializeAsync<ChairPostChairsRequest>(context.Request.Body);
      if (request == null || string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Model) ||
          string.IsNullOrEmpty(request.ChairRegisterToken))
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest,
          "Some of the required fields (name, model, chair_register_token) are empty.");
        return;
      }

      var owner = await db.QueryFirstOrDefaultAsync<Owner>(
        "SELECT * FROM owners WHERE chair_register_token = @ChairRegisterToken",
        new { request.ChairRegisterToken });
      if (owner == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "Invalid chair_register_token.");
        return;
      }

      var chairId = Ulid.NewUlid().ToString();
      var accessToken = Utils.SecureRandomStr(32);

      await db.ExecuteAsync(
        "INSERT INTO chairs (id, owner_id, name, model, is_active, access_token) VALUES (@ID, @OwnerID, @Name, @Model, @IsActive, @AccessToken)",
        new
        {
          ID = chairId,
          OwnerID = owner.ID,
          Name = request.Name,
          Model = request.Model,
          IsActive = false,
          AccessToken = accessToken
        });

      context.Response.Cookies.Append("chair_session", accessToken, new CookieOptions
      {
        Path = "/",
        HttpOnly = true
      });

      var response = new ChairPostChairsResponse
      {
        Id = chairId,
        OwnerId = owner.ID
      };
      await Request.WriteJsonAsync(context, response, StatusCodes.Status201Created);
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private class PostChairActivityRequest
  {
    [JsonPropertyName("is_active")] public bool IsActive { get; init; }
  }

  public static async Task ChairPostActivityAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      // `chair` が Context に格納されていると仮定
      if (context.Items["chair"] is not Chair chair)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "Chair not found in context.");
        return;
      }

      // リクエストの解析
      var request = await JsonSerializer.DeserializeAsync<PostChairActivityRequest>(context.Request.Body);
      if (request == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid request body.");
        return;
      }

      // データベース更新
      const string query = "UPDATE chairs SET is_active = @IsActive WHERE id = @ChairId";
      var rowsAffected = await db.ExecuteAsync(query, new { request.IsActive, ChairId = chair.ID });

      if (rowsAffected == 0)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Chair not found.");
        return;
      }

      // ステータスコード 204 No Content を返す
      context.Response.StatusCode = StatusCodes.Status204NoContent;
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private class Coordinate
  {
    [JsonPropertyName("latitude")] public int Latitude { get; init; }

    [JsonPropertyName("longitude")] public int Longitude { get; init; }
  }

  private class ChairPostCoordinateResponse
  {
    [JsonPropertyName("recorded_at")] public long RecordedAt { get; set; }
  }

  public static async Task ChairPostCoordinateAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      if (context.Items["chair"] is not Chair chair)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "Chair not found in context.");
        return;
      }

      var request = await JsonSerializer.DeserializeAsync<Coordinate>(context.Request.Body);
      if (request == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid request body.");
        return;
      }

      using var transaction = db.BeginTransaction();

      var chairLocationId = Ulid.NewUlid().ToString();
      const string insertLocationQuery = """
                                         INSERT INTO chair_locations (id, chair_id, latitude, longitude)
                                         VALUES (@Id, @ChairId, @Latitude, @Longitude)
                                         """;
      await db.ExecuteAsync(insertLocationQuery, new
      {
        Id = chairLocationId,
        ChairId = chair.ID,
        request.Latitude,
        request.Longitude
      }, transaction);

      const string selectLocationQuery = "SELECT * FROM chair_locations WHERE id = @Id";
      var location =
        await db.QueryFirstOrDefaultAsync<ChairLocation>(selectLocationQuery, new { Id = chairLocationId },
          transaction);

      if (location == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError,
          "Failed to retrieve chair location.");
        return;
      }

      const string selectRideQuery = "SELECT * FROM rides WHERE chair_id = @ChairId ORDER BY updated_at DESC LIMIT 1";
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(selectRideQuery, new { ChairId = chair.ID }, transaction);

      if (ride != null)
      {
        // ライドステータスの取得
        var status = await GetLatestRideStatusAsync(transaction, ride.ID);

        if (!string.IsNullOrEmpty(status) && status != "COMPLETED" && status != "CANCELED")
        {
          if (request.Latitude == ride.PickupLatitude &&
              request.Longitude == ride.PickupLongitude &&
              status == "ENROUTE")
          {
            const string insertPickupStatusQuery = """
                                                   INSERT INTO ride_statuses (id, ride_id, status)
                                                   VALUES (@Id, @RideId, 'PICKUP')
                                                   """;
            await db.ExecuteAsync(insertPickupStatusQuery, new
            {
              Id = Ulid.NewUlid().ToString(),
              RideId = ride.ID
            }, transaction);
          }

          if (request.Latitude == ride.DestinationLatitude &&
              request.Longitude == ride.DestinationLongitude &&
              status == "CARRYING")
          {
            const string insertArrivedStatusQuery = """
                                                    INSERT INTO ride_statuses (id, ride_id, status)
                                                    VALUES (@Id, @RideId, 'ARRIVED')
                                                    """;
            await db.ExecuteAsync(insertArrivedStatusQuery, new
            {
              Id = Ulid.NewUlid().ToString(),
              RideId = ride.ID
            }, transaction);
          }
        }
      }

      transaction.Commit();

      await Request.WriteJsonAsync(context, new ChairPostCoordinateResponse
      {
        RecordedAt = location.CreatedAt.ToUnixTimeMilliseconds()
      });
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static async Task<string> GetLatestRideStatusAsync(IDbTransaction transaction, string rideId)
  {
    const string query = """
                         SELECT status FROM ride_statuses
                         WHERE ride_id = @RideId
                         ORDER BY created_at DESC LIMIT 1
                         """;
    return await transaction.Connection!.QueryFirstAsync<string>(query, new { RideId = rideId }, transaction);
  }

  private class ChairGetNotificationResponse
  {
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("data")]
    public ChairGetNotificationResponseData? Data { get; set; }

    [JsonPropertyName("retry_after_ms")] public int RetryAfterMs { get; set; }
  }

  private class ChairGetNotificationResponseData
  {
    [JsonPropertyName("ride_id")] public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("user")] public SimpleUser User { get; set; } = new();

    [JsonPropertyName("pickup_coordinate")]
    public Coordinate PickupCoordinate { get; set; } = new();

    [JsonPropertyName("destination_coordinate")]
    public Coordinate DestinationCoordinate { get; set; } = new();

    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
  }

  private class SimpleUser
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
  }

  public static async Task ChairGetNotificationAsync(HttpContext context, IDbConnection db)
  {
    if (context.Items["chair"] is not Chair chair)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, "Chair context is missing.");
      return;
    }

    using var transaction = db.BeginTransaction();

    try
    {
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE chair_id = @ChairId ORDER BY updated_at DESC LIMIT 1",
        new { ChairId = chair.ID },
        transaction
      );

      if (ride == null)
      {
        await Request.WriteJsonAsync(context, new ChairGetNotificationResponse { RetryAfterMs = 30 });
        return;
      }

      var yetSentRideStatus = await db.QueryFirstOrDefaultAsync<RideStatus>(
        "SELECT * FROM ride_statuses WHERE ride_id = @RideId AND chair_sent_at IS NULL ORDER BY created_at ASC LIMIT 1",
        new { RideId = ride.ID },
        transaction
      );

      string status;
      if (yetSentRideStatus != null)
      {
        status = yetSentRideStatus.Status;
        await db.ExecuteAsync(
          "UPDATE ride_statuses SET chair_sent_at = CURRENT_TIMESTAMP(6) WHERE id = @Id",
          new { yetSentRideStatus.ID },
          transaction
        );
      }
      else
      {
        status = await GetLatestRideStatusAsync(db, transaction, ride.ID);
      }

      var user = await db.QueryFirstOrDefaultAsync<User>(
        "SELECT * FROM users WHERE id = @UserId FOR SHARE",
        new { UserId = ride.UserID },
        transaction
      );

      if (user == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, "User not found.");
        return;
      }

      transaction.Commit();

      var response = new ChairGetNotificationResponse
      {
        Data = new ChairGetNotificationResponseData
        {
          RideId = ride.ID,
          User = new SimpleUser
          {
            Id = user.ID,
            Name = $"{user.Firstname} {user.Lastname}"
          },
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
          Status = status
        },
        RetryAfterMs = 30
      };

      await Request.WriteJsonAsync(context, response);
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static async Task<string> GetLatestRideStatusAsync(IDbConnection db, IDbTransaction transaction,
    string rideId)
  {
    return await db.QueryFirstAsync<string>(
      "SELECT status FROM ride_statuses WHERE ride_id = @RideId ORDER BY created_at DESC LIMIT 1",
      new { RideId = rideId },
      transaction
    );
  }

  private class PostChairRidesRideIDStatusRequest
  {
    [JsonPropertyName("status")] public string Status { get; init; } = string.Empty;
  }

  public static async Task ChairPostRideStatusAsync(HttpContext context, IDbConnection db)
  {
    var rideId = context.Request.RouteValues["ride_id"]?.ToString();
    if (string.IsNullOrEmpty(rideId))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "ride_id is missing from the route.");
      return;
    }

    if (context.Items["chair"] is not Chair chair)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, "Chair context is missing.");
      return;
    }

    var req = await JsonSerializer.DeserializeAsync<PostChairRidesRideIDStatusRequest>(context.Request.Body);
    if (req == null || string.IsNullOrEmpty(req.Status))
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid request body.");
      return;
    }

    using var transaction = db.BeginTransaction();

    try
    {
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE id = @RideId FOR UPDATE",
        new { RideId = rideId },
        transaction
      );

      if (ride == null)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status404NotFound, "Ride not found.");
        return;
      }

      if (ride.ChairID != chair.ID)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Not assigned to this ride.");
        return;
      }

      switch (req.Status.ToUpper())
      {
        case "ENROUTE":
          await db.ExecuteAsync(
            "INSERT INTO ride_statuses (id, ride_id, status) VALUES (@Id, @RideId, @Status)",
            new { Id = Ulid.NewUlid().ToString(), RideId = ride.ID, Status = "ENROUTE" },
            transaction
          );
          break;

        case "CARRYING":
          var latestStatus = await GetLatestRideStatusAsync(db, transaction, ride.ID);
          if (latestStatus != "PICKUP")
          {
            await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Chair has not arrived yet.");
            return;
          }

          await db.ExecuteAsync(
            "INSERT INTO ride_statuses (id, ride_id, status) VALUES (@Id, @RideId, @Status)",
            new { Id = Ulid.NewUlid().ToString(), RideId = ride.ID, Status = "CARRYING" },
            transaction
          );
          break;

        default:
          await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid status.");
          return;
      }

      transaction.Commit();
      context.Response.StatusCode = StatusCodes.Status204NoContent;
    }
    catch (Exception ex)
    {
      transaction.Rollback();
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }
}
