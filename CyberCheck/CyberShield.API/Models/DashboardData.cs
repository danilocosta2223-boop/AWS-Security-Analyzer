namespace CyberShield.API.Models;

public class DashboardData
{
    public int TotalScans { get; set; }
    public double AverageScore { get; set; }
    public int ActiveThreatsFound { get; set; }
    public string SystemStatus { get; set; } = "Operational";
}