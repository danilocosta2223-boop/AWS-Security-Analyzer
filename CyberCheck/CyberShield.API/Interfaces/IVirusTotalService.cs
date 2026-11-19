using CyberShield.API.DTOs;

namespace CyberShield.API.Interfaces;

public interface IVirusTotalService
{
    Task<VirusTotalResponseDto> AnalyzeUrlAsync(string url);
}