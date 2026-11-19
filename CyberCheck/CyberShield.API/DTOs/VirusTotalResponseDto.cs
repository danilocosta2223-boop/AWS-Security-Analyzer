namespace CyberShield.API.DTOs;

public class VirusTotalResponseDto
{
    public int Malicious { get; set; }
    public int Suspicious { get; set; }
    public int Harmless { get; set; }
    public string Status { get; set; } = string.Empty;
}