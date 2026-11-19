using System.ComponentModel.DataAnnotations;

namespace CyberShield.API.DTOs;

public class AuditRequestDto
{
    [Required]
    public string Url { get; set; } = string.Empty;
}