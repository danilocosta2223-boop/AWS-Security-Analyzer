namespace CyberShield.API.Models;

public class SslInfo
{
    public string Issuer { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool IsValid { get; set; }
}