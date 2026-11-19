namespace CyberShield.API.Models;

public class SecurityHeader
{
    public string HeaderName { get; set; } = string.Empty;
    public string HeaderValue { get; set; } = string.Empty;
    public bool IsPresent { get; set; }
}