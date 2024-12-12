using System.Text.Json.Serialization;

public class Chair
{
  public string ID { get; set; }
  public string OwnerID { get; set; }
  public string Name { get; set; }
  public string Model { get; set; }
  public bool IsActive { get; set; }
  public string AccessToken { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}

public class ChairModel
{
  public string Name { get; set; }
  public int Speed { get; set; }
}

public class ChairLocation
{
  public string ID { get; set; }
  public string ChairID { get; set; }
  public int Latitude { get; set; }
  public int Longitude { get; set; }
  public DateTime CreatedAt { get; set; }
}

public class User
{
  public string ID { get; set; }
  public string Username { get; set; }
  public string Firstname { get; set; }
  public string Lastname { get; set; }
  public string DateOfBirth { get; set; }
  public string AccessToken { get; set; }
  public string InvitationCode { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}

public class PaymentToken
{
  public string UserID { get; set; }
  public string Token { get; set; }
  public DateTime CreatedAt { get; set; }
}

public class Ride
{
  public string ID { get; set; }
  public string UserID { get; set; }
  public string? ChairID { get; set; } // Nullable string
  public int PickupLatitude { get; set; }
  public int PickupLongitude { get; set; }
  public int DestinationLatitude { get; set; }
  public int DestinationLongitude { get; set; }
  public int? Evaluation { get; set; } // Nullable int
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}

public class RideStatus
{
  public string ID { get; set; }
  public string RideID { get; set; }
  public string Status { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? AppSentAt { get; set; } // Nullable DateTime
  public DateTime? ChairSentAt { get; set; } // Nullable DateTime
}

public class Owner
{
  public string ID { get; set; }
  public string Name { get; set; }
  public string AccessToken { get; set; }
  public string ChairRegisterToken { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}

public class Coupon
{
  public string UserID { get; set; }
  public string Code { get; set; }
  public int Discount { get; set; }
  public DateTime CreatedAt { get; set; }
  public string? UsedBy { get; set; } // Nullable string
}

public class Coordinate
{
  [JsonPropertyName("latitude")] public int Latitude { get; set; }

  [JsonPropertyName("longitude")] public int Longitude { get; set; }
}
