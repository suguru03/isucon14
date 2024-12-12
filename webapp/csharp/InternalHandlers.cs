using System.Data;
using Dapper;

public static class InternalHandlers
{
  public static async Task InternalGetMatchingAsync(HttpContext context, IDbConnection db)
  {
    try
    {
      // Get the first unmatched ride
      var ride = await db.QueryFirstOrDefaultAsync<Ride>(
        "SELECT * FROM rides WHERE chair_id IS NULL ORDER BY created_at LIMIT 1"
      );

      if (ride == null)
      {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
      }

      Chair? matched = null;
      var empty = false;

      for (var i = 0; i < 10; i++)
      {
        // Get a random active chair
        matched = await db.QueryFirstOrDefaultAsync<Chair>(
          """
          SELECT * FROM chairs
                                INNER JOIN (SELECT id FROM chairs WHERE is_active = TRUE ORDER BY RAND() LIMIT 1) AS tmp
                                ON chairs.id = tmp.id LIMIT 1
          """
        );

        if (matched == null)
        {
          context.Response.StatusCode = StatusCodes.Status204NoContent;
          return;
        }

        // Check if chair is not fully used
        empty = await db.QueryFirstOrDefaultAsync<bool>(
          """
          SELECT COUNT(*) = 0 FROM (
                                    SELECT COUNT(chair_sent_at) = 6 AS completed
                                    FROM ride_statuses
                                    WHERE ride_id IN (SELECT id FROM rides WHERE chair_id = @ChairID)
                                    GROUP BY ride_id
                                ) is_completed WHERE completed = FALSE
          """,
          new { ChairID = matched.ID }
        );

        if (empty)
        {
          break;
        }
      }

      if (!empty)
      {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
      }

      // Update the ride with the matched chair
      await db.ExecuteAsync(
        "UPDATE rides SET chair_id = @ChairID WHERE id = @RideID",
        new { ChairID = matched.ID, RideID = ride.ID }
      );

      context.Response.StatusCode = StatusCodes.Status204NoContent;
    }
    catch (Exception ex)
    {
      await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
    }
  }

  // Data models
  public class Ride
  {
    public string ID { get; set; }
    public string ChairID { get; set; }
    public DateTime CreatedAt { get; set; }
  }

  public class Chair
  {
    public string ID { get; set; }
    public bool IsActive { get; set; }
  }
}
