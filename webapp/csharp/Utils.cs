using System.Security.Cryptography;

public static class Utils
{
  public static string SecureRandomStr(int length)
  {
    var bytes = new byte[length];
    RandomNumberGenerator.Fill(bytes);
    return Convert.ToHexString(bytes);
  }
}
