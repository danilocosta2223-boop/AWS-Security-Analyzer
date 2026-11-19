namespace CyberShield.API.Models;

public class VirusTotalResult
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public int Malicious { get; set; }
    public int Suspicious { get; set; }
    public int Harmless { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}