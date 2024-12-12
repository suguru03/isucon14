using System.Data;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Dapper;

public abstract class BaseAuthHandler<TUser>(
  IOptionsMonitor<AuthenticationSchemeOptions> options,
  ILoggerFactory logger,
  UrlEncoder encoder,
  ISystemClock clock,
  IDbConnection db,
  string cookieName,
  string query,
  string contextKey)
  : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder, clock)
{
  protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
  {
    var token = Request.Cookies[cookieName];
    if (string.IsNullOrEmpty(token))
    {
      return AuthenticateResult.Fail($"{cookieName} cookie is required.");
    }

    var user = await db.QueryFirstOrDefaultAsync<TUser>(query, new { AccessToken = token });
    if (user == null)
    {
      return AuthenticateResult.Fail("Invalid access token.");
    }

    Context.Items[contextKey] = user;

    var claims = new[] { new Claim(ClaimTypes.Name, token) };
    var identity = new ClaimsIdentity(claims, Scheme.Name);
    var principal = new ClaimsPrincipal(identity);
    var ticket = new AuthenticationTicket(principal, Scheme.Name);

    return AuthenticateResult.Success(ticket);
  }
}

public class AppSessionAuthHandler(
  IOptionsMonitor<AuthenticationSchemeOptions> options,
  ILoggerFactory logger,
  UrlEncoder encoder,
  ISystemClock clock,
  IDbConnection db)
  : BaseAuthHandler<User>(options, logger, encoder, clock, db, "app_session",
    "SELECT * FROM users WHERE access_token = @AccessToken", "user");

public class OwnerSessionAuthHandler(
  IOptionsMonitor<AuthenticationSchemeOptions> options,
  ILoggerFactory logger,
  UrlEncoder encoder,
  ISystemClock clock,
  IDbConnection db)
  : BaseAuthHandler<Owner>(options, logger, encoder, clock, db, "owner_session",
    "SELECT * FROM owners WHERE access_token = @AccessToken", "owner");

public class ChairSessionAuthHandler(
  IOptionsMonitor<AuthenticationSchemeOptions> options,
  ILoggerFactory logger,
  UrlEncoder encoder,
  ISystemClock clock,
  IDbConnection db)
  : BaseAuthHandler<Chair>(options, logger, encoder, clock, db, "chair_session",
    "SELECT * FROM chairs WHERE access_token = @AccessToken", "chair");
