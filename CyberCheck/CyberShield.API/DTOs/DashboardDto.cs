namespace CyberShield.API.DTOs;

public class DashboardDto
{
    public string Status { get; set; } = "online";

    public int TotalScans { get; set; }

    public int TotalReports { get; set; }

    public string LatestScan { get; set; } = "Nenhum";
}