using System.Text.Json;

public static class Request
{
  public static async Task WriteJsonAsync(HttpContext context, int statusCode = StatusCodes.Status200OK)
  {
    var response = context.Response;
    response.ContentType = "application/json;charset=utf-8";
    response.StatusCode = statusCode;
    await response.CompleteAsync();
  }

  public static async Task WriteJsonAsync(HttpContext context, object data, int statusCode = StatusCodes.Status200OK)
  {
    var response = context.Response;
    response.ContentType = "application/json;charset=utf-8";
    response.StatusCode = statusCode;
    await JsonSerializer.SerializeAsync(context.Response.Body, data);
  }

  public static Task WriteErrorAsync(HttpContext context, int statusCode, string exception)
  {
    return WriteErrorAsync(context, statusCode, new Exception(exception));
  }

  public static async Task WriteErrorAsync(HttpContext context, int statusCode, Exception exception)
  {
    var response = context.Response;
    response.ContentType = "application/json;charset=utf-8";
    response.StatusCode = statusCode;
    var errorResponse = JsonSerializer.Serialize(new { message = exception.Message });
    await response.WriteAsync(errorResponse);

    await Console.Error.WriteLineAsync($"Error: {exception}");
  }
}
