public static class DateTimeExtensions
{
  public static long ToUnixTimeMilliseconds(this DateTime dateTime)
  {
    return (long)(dateTime - DateTime.UnixEpoch).TotalMilliseconds;
  }
}
