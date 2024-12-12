using System.Text.Json;
using System.Text.Json.Serialization;

public static class PaymentGateway
{
  public class PaymentGatewayPostPaymentRequest
  {
    [JsonPropertyName("amount")] public int Amount { get; set; }
  }

  private class PaymentGatewayGetPaymentsResponseOne
  {
    [JsonPropertyName("amount")] public int Amount { get; set; }

    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
  }

  private static readonly HttpClient HttpClient = new HttpClient();

  public static async Task RequestPaymentGatewayPostPaymentAsync(
    string paymentGatewayUrl,
    string token,
    PaymentGatewayPostPaymentRequest param,
    Func<Task<List<Ride>>> retrieveRidesOrderByCreatedAtAsc
  )
  {
    var jsonContent = JsonSerializer.Serialize(param);
    var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

    var retry = 0;

    while (true)
    {
      try
      {
        var postRequest = new HttpRequestMessage(HttpMethod.Post, $"{paymentGatewayUrl}/payments")
        {
          Content = content
        };
        postRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var postResponse = await HttpClient.SendAsync(postRequest);

        if (postResponse.StatusCode != System.Net.HttpStatusCode.NoContent)
        {
          var getRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentGatewayUrl}/payments");
          getRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

          var getResponse = await HttpClient.SendAsync(getRequest);

          if (getResponse.StatusCode != System.Net.HttpStatusCode.OK)
          {
            throw new InvalidOperationException($"[GET /payments] unexpected status code: {getResponse.StatusCode}");
          }

          var responseContent = await getResponse.Content.ReadAsStringAsync();
          var payments = JsonSerializer.Deserialize<List<PaymentGatewayGetPaymentsResponseOne>>(responseContent);

          if (payments == null)
          {
            throw new InvalidOperationException("Failed to parse payments response.");
          }

          var rides = await retrieveRidesOrderByCreatedAtAsc();
          if (rides.Count != payments.Count)
          {
            throw new InvalidOperationException($"Unexpected number of payments: {rides.Count} != {payments.Count}");
          }

          return;
        }

        return; // 成功したら終了
      }
      catch (Exception ex)
      {
        if (retry < 5)
        {
          retry++;
          await Task.Delay(100);
          continue;
        }

        throw new InvalidOperationException("Payment gateway request failed after multiple retries.", ex);
      }
    }
  }
}
