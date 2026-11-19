namespace CyberShield.API.DTOs;

public class AuditResponseDto
{
    public string Url { get; set; } = string.Empty;

    public int Score { get; set; }

    public string Risk { get; set; } = string.Empty;

    public bool SslValid { get; set; }

    public DateTime ScanDate { get; set; }
}