using CyberShield.API.DTOs;

namespace CyberShield.API.Interfaces;

public interface IAuditService
{
    Task<AuditResponseDto> ExecuteAuditAsync(
        AuditRequestDto request
    );
}