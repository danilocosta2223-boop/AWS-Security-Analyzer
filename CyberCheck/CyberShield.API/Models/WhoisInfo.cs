namespace CyberShield.API.Models;

public class WhoisInfo
{
    public string Registrar { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public string Owner { get; set; } = string.Empty;
}