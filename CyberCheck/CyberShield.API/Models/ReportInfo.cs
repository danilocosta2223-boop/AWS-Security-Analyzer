namespace CyberShield.API.Models;

public class ReportInfo
{
    public string ReportId { get; set; } = Guid.NewGuid().ToString();
    public string Summary { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}