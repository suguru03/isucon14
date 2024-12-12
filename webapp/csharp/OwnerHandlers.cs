using System.Text.Json.Serialization;
using Dapper;
using System.Data;
using System.Text.Json;

public static class OwnerHandlers
{
  private class OwnerPostOwnersRequest
  {
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
  }

  private class OwnerPostOwnersResponse
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("chair_register_token")]
    public string ChairRegisterToken { get; set; } = string.Empty;
  }

  public static async Task OwnerPostOwnersAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      var request = await JsonSerializer.DeserializeAsync<OwnerPostOwnersRequest>(context.Request.Body);

      if (request == null || string.IsNullOrWhiteSpace(request.Name))
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest,
          "Some required fields (name) are empty.");
        return;
      }

      var ownerId = Ulid.NewUlid().ToString();
      var accessToken = Utils.SecureRandomStr(32);
      var chairRegisterToken = Utils.SecureRandomStr(32);

      const string query = """
                               INSERT INTO owners (id, name, access_token, chair_register_token)
                               VALUES (@ID, @Name, @AccessToken, @ChairRegisterToken)
                           """;
      await db.ExecuteAsync(query, new
      {
        ID = ownerId,
        request.Name,
        AccessToken = accessToken,
        ChairRegisterToken = chairRegisterToken
      });

      context.Response.Cookies.Append("owner_session", accessToken, new CookieOptions
      {
        Path = "/",
        HttpOnly = true
      });

      var response = new OwnerPostOwnersResponse
      {
        Id = ownerId,
        ChairRegisterToken = chairRegisterToken
      };

      await Request.WriteJsonAsync(context, response, StatusCodes.Status201Created);
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private class ChairSales
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [JsonPropertyName("sales")] public int Sales { get; set; }
  }

  private class ModelSales
  {
    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("sales")] public int Sales { get; set; }
  }

  private class OwnerGetSalesResponse
  {
    [JsonPropertyName("total_sales")] public int TotalSales { get; set; }

    [JsonPropertyName("chairs")] public List<ChairSales> Chairs { get; set; } = [];

    [JsonPropertyName("models")] public List<ModelSales> Models { get; set; } = [];
  }

  public static async Task OwnerGetSalesAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      var since = DateTimeOffset.UnixEpoch;
      var until = new DateTime(9999, 12, 31, 23, 59, 59, DateTimeKind.Utc);

      if (context.Request.Query.ContainsKey("since"))
      {
        if (long.TryParse(context.Request.Query["since"], out var sinceMs))
        {
          since = DateTimeOffset.FromUnixTimeMilliseconds(sinceMs);
        }
        else
        {
          await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid 'since' parameter.");
          return;
        }
      }

      if (context.Request.Query.ContainsKey("until"))
      {
        if (long.TryParse(context.Request.Query["until"], out var untilMs))
        {
          until = DateTimeOffset.FromUnixTimeMilliseconds(untilMs).UtcDateTime;
        }
        else
        {
          await Request.WriteErrorAsync(context, StatusCodes.Status400BadRequest, "Invalid 'until' parameter.");
          return;
        }
      }

      if (context.Items["owner"] is not Owner owner)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "Unauthorized access.");
        return;
      }

      var chairs = await db.QueryAsync<Chair>("SELECT * FROM chairs WHERE owner_id = @OwnerID",
        new { OwnerID = owner.ID });

      var response = new OwnerGetSalesResponse { TotalSales = 0 };
      var modelSalesByModel = new Dictionary<string, int>();

      foreach (var chair in chairs)
      {
        var rides = await db.QueryAsync<Ride>(
          """
          SELECT rides.* FROM rides
                                JOIN ride_statuses ON rides.id = ride_statuses.ride_id
                                WHERE chair_id = @ChairID AND status = 'COMPLETED'
                                AND updated_at BETWEEN @Since AND @Until + INTERVAL 999 MICROSECOND
          """,
          new { ChairID = chair.ID, Since = since.UtcDateTime, Until = until });

        var sales = SumSales(rides);
        response.TotalSales += sales;

        response.Chairs.Add(new ChairSales
        {
          Id = chair.ID,
          Name = chair.Name,
          Sales = sales
        });

        if (!modelSalesByModel.ContainsKey(chair.Model))
        {
          modelSalesByModel[chair.Model] = 0;
        }

        modelSalesByModel[chair.Model] += sales;
      }

      foreach (var model in modelSalesByModel)
      {
        response.Models.Add(new ModelSales
        {
          Model = model.Key,
          Sales = model.Value
        });
      }

      await Request.WriteJsonAsync(context, response);
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  private static int SumSales(IEnumerable<Ride> rides)
  {
    return rides.Sum(CalculateSale);
  }

  private static int CalculateSale(Ride ride)
  {
    return CalculateFare(ride.PickupLatitude, ride.PickupLongitude, ride.DestinationLatitude,
      ride.DestinationLongitude);
  }

  private static int CalculateFare(int pickupLatitude, int pickupLongitude, int destLatitude, int destLongitude)
  {
    const int initialFare = 500;
    const int farePerDistance = 100;
    var distance = Math.Abs(pickupLatitude - destLatitude) + Math.Abs(pickupLongitude - destLongitude);
    return initialFare + farePerDistance * distance;
  }

  private class ChairWithDetail
  {
    public string Id { get; init; } = string.Empty;

    public string OwnerId { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string AccessToken { get; init; } = string.Empty;

    public string Model { get; init; } = string.Empty;

    public bool IsActive { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }

    public int TotalDistance { get; init; }

    public DateTime? TotalDistanceUpdatedAt { get; init; }
  }

  private class OwnerGetChairResponse
  {
    [JsonPropertyName("chairs")] public List<OwnerGetChairResponseChair> Chairs { get; set; } = [];
  }

  private class OwnerGetChairResponseChair
  {
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("active")] public bool Active { get; set; }

    [JsonPropertyName("registered_at")] public long RegisteredAt { get; set; }

    [JsonPropertyName("total_distance")] public int TotalDistance { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("total_distance_updated_at")]
    public long? TotalDistanceUpdatedAt { get; set; }
  }

  public static async Task OwnerGetChairsAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      // 認証済みオーナーの取得
      if (context.Items["owner"] is not Owner owner)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status401Unauthorized, "Unauthorized access.");
        return;
      }


      // 椅子の詳細を取得
      const string query = """
                           SELECT id,
                           owner_id,
                           name,
                           access_token,
                           model,
                           is_active,
                           created_at,
                           updated_at,
                           IFNULL(total_distance, 0) AS total_distance,
                           total_distance_updated_at
                           FROM chairs
                           LEFT JOIN (
                           SELECT chair_id,
                           SUM(IFNULL(distance, 0)) AS total_distance,
                           MAX(created_at) AS total_distance_updated_at
                           FROM (
                           SELECT chair_id,
                           created_at,
                           ABS(latitude - LAG(latitude) OVER (PARTITION BY chair_id ORDER BY created_at)) +
                           ABS(longitude - LAG(longitude) OVER (PARTITION BY chair_id ORDER BY created_at)) AS distance
                           FROM chair_locations
                           ) tmp
                           GROUP BY chair_id
                           ) distance_table ON distance_table.chair_id = chairs.id
                           WHERE owner_id = @OwnerID
                           """;
      var chairs = (await db.QueryAsync<ChairWithDetail>(query, new { OwnerID = owner.ID })).ToList();

      // レスポンス構築
      var response = new OwnerGetChairResponse();

      foreach (var chair in chairs)
      {
        var chairResponse = new OwnerGetChairResponseChair
        {
          Id = chair.Id,
          Name = chair.Name,
          Model = chair.Model,
          Active = chair.IsActive,
          RegisteredAt = chair.CreatedAt.ToUnixTimeMilliseconds(),
          TotalDistance = chair.TotalDistance,
          TotalDistanceUpdatedAt = chair.TotalDistanceUpdatedAt?.ToUnixTimeMilliseconds()
        };

        response.Chairs.Add(chairResponse);
      }

      await Request.WriteJsonAsync(context, response);
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }
}
