namespace CyberShield.API.Models;

public class AuditResult
{
    public int Id { get; set; }
    public string Target { get; set; } = string.Empty;
    public int SecurityScore { get; set; }
    public string Status { get; set; } = "Completed";
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}