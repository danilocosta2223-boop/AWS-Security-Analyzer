namespace CyberShield.API.DTOs;

public class ReportDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty; // PDF, HTML, CSV
    public DateTime CreatedAt { get; set; }
}