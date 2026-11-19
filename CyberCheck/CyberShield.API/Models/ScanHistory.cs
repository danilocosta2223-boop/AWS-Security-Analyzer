namespace CyberShield.API.Models;

public class ScanHistory
{
    public int Id { get; set; }
    public string Target { get; set; } = string.Empty;
    public int Score { get; set; }
    public DateTime ScanDate { get; set; } = DateTime.UtcNow;
}