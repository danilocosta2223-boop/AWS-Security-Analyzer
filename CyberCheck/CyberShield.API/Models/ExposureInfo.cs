namespace CyberShield.API.Models;

public class ExposureInfo
{
    public string Target { get; set; } = string.Empty;
    public int BreachesDetected { get; set; }
    public string SeverityLevel { get; set; } = "Low";
}