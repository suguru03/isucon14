using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using MySql.Data.MySqlClient;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;

public static class Program
{
  public static void Main(string[] args)
  {
    DefaultTypeMap.MatchNamesWithUnderscores = true;

    var builder = WebApplication.CreateBuilder(args);

    // Set up services if needed (not required for this example)
    var connectionString = GetConnectionString();
    builder.Services.AddScoped<IDbConnection>(_ => new MySqlConnection(connectionString));

    builder.Services.AddAuthentication()
      .AddScheme<AuthenticationSchemeOptions, AppSessionAuthHandler>("app_session", _ => { })
      .AddScheme<AuthenticationSchemeOptions, OwnerSessionAuthHandler>("owner_session", _ => { })
      .AddScheme<AuthenticationSchemeOptions, ChairSessionAuthHandler>("chair_session", _ => { });

    builder.Services.AddAuthorization();

    var app = builder.Build();

    app.Use(async (context, next) =>
    {
      var db = context.RequestServices.GetRequiredService<IDbConnection>();
      if (db is MySqlConnection conn)
      {
        await conn.OpenAsync();
      }
      else
      {
        db.Open();
      }

      await next();
    });

    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();

    ConfigureRoutes(app);

    app.Run();
  }

  private static string GetConnectionString()
  {
    var host = Environment.GetEnvironmentVariable("ISUCON_DB_HOST") ?? "127.0.0.1";
    var port = Environment.GetEnvironmentVariable("ISUCON_DB_PORT") ?? "3306";
    var user = Environment.GetEnvironmentVariable("ISUCON_DB_USER") ?? "isucon";
    var password = Environment.GetEnvironmentVariable("ISUCON_DB_PASSWORD") ?? "isucon";
    var dbName = Environment.GetEnvironmentVariable("ISUCON_DB_NAME") ?? "isuride";

    return $"Server={host};Port={port};User={user};Password={password};Database={dbName};Convert Zero Datetime=True;";
  }

  private static void ConfigureRoutes(WebApplication app)
  {
    ConfigureInitRoute(app);
    ConfigureAppRoutes(app);
    ConfigureOwnerRoutes(app);
    ConfigureChairRoutes(app);
    ConfigureInternalRoutes(app);
  }

  private static void ConfigureInitRoute(WebApplication app)
  {
    // Routes
    app.MapPost("/api/initialize", async (HttpContext context, IDbConnection db) =>
    {
      try
      {
        var request = await JsonSerializer.DeserializeAsync<PostInitializeRequest>(context.Request.Body);

        var process = new System.Diagnostics.Process
        {
          StartInfo = new System.Diagnostics.ProcessStartInfo
          {
            FileName = "../sql/init.sh",
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
          }
        };
        process.Start();
        await process.WaitForExitAsync();

        // Example DB operation
        const string query = "UPDATE settings SET value = @PaymentServer WHERE name = 'payment_gateway_url'";
        await db.ExecuteAsync(query, new { request!.PaymentServer });

        await Request.WriteJsonAsync(context, new PostInitializeResponse { Language = "C#" });
      }
      catch (Exception ex)
      {
        await Request.WriteErrorAsync(context, StatusCodes.Status500InternalServerError, ex);
      }
    });
  }

  public class PostInitializeRequest
  {
    [JsonPropertyName("payment_server")] public string PaymentServer { get; init; } = string.Empty;
  }

  private class PostInitializeResponse
  {
    [JsonPropertyName("language")] public string Language { get; init; } = string.Empty;
  }

  private static void ConfigureAppRoutes(WebApplication app)
  {
    app.MapPost("/api/app/users",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppPostUsersAsync(context, db));

    var appGroup = app.MapGroup("/api/app")
      .RequireAuthorization(new AuthorizationPolicyBuilder("app_session").RequireAuthenticatedUser().Build());

    appGroup.MapPost("/payment-methods",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppPostPaymentMethodsAsync(context, db));

    appGroup.MapGet("/rides",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppGetRidesAsync(context, db));

    appGroup.MapPost("/rides",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppPostRidesAsync(context, db));

    appGroup.MapPost("/rides/estimated-fare",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppPostRidesEstimatedFareAsync(context, db));

    appGroup.MapPost("/rides/{ride_id}/evaluation",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppPostRideEvaluationAsync(context, db));

    appGroup.MapGet("/notification",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppGetNotificationAsync(context, db));

    appGroup.MapGet("/nearby-chairs",
      async (HttpContext context, IDbConnection db) => await AppHandlers.AppGetNearbyChairsAsync(context, db));
  }

  private static void ConfigureOwnerRoutes(WebApplication app)
  {
    app.MapPost("/api/owner/owners",
      async (HttpContext context, IDbConnection db) => await OwnerHandlers.OwnerPostOwnersAsync(context, db));

    var ownerGroup = app.MapGroup("/api/owner")
      .RequireAuthorization(new AuthorizationPolicyBuilder("owner_session").RequireAuthenticatedUser().Build());

    ownerGroup.MapGet("/sales",
      async (HttpContext context, IDbConnection db) => await OwnerHandlers.OwnerGetSalesAsync(context, db));
    ownerGroup.MapGet("/chairs",
      async (HttpContext context, IDbConnection db) => await OwnerHandlers.OwnerGetChairsAsync(context, db));
  }

  private static void ConfigureChairRoutes(WebApplication app)
  {
    app.MapPost("/api/chair/chairs",
      async (HttpContext context, IDbConnection db) => await ChairHandlers.ChairPostChairsAsync(context, db));

    var chairGroup = app.MapGroup("/api/chair")
      .RequireAuthorization(new AuthorizationPolicyBuilder("chair_session").RequireAuthenticatedUser().Build());

    chairGroup.MapPost("/activity",
      async (HttpContext context, IDbConnection db) => await ChairHandlers.ChairPostActivityAsync(context, db));
    chairGroup.MapPost("/coordinate",
      async (HttpContext context, IDbConnection db) => await ChairHandlers.ChairPostCoordinateAsync(context, db));
    chairGroup.MapGet("/notification",
      async (HttpContext context, IDbConnection db) => await ChairHandlers.ChairGetNotificationAsync(context, db));
    chairGroup.MapPost("/rides/{ride_id}/status",
      async (HttpContext context, IDbConnection db) => await ChairHandlers.ChairPostRideStatusAsync(context, db));
  }

  private static void ConfigureInternalRoutes(WebApplication app)
  {
    app.MapGet("/api/internal/matching",
      async (HttpContext context, IDbConnection db) => await InternalHandlers.InternalGetMatchingAsync(context, db));
  }
}
