using CyberShield.API.DTOs;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

public class AuditService : IAuditService
{
    public async Task<AuditResponseDto> ExecuteAuditAsync(
        AuditRequestDto request
    )
    {
        await Task.Delay(500);

        return new AuditResponseDto
        {
            Url = request.Url,
            Score = 90,
            Risk = "LOW",
            SslValid = true,
            ScanDate = DateTime.UtcNow
        };
    }
}