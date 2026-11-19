using CyberShield.API.DTOs;

namespace CyberShield.API.Interfaces;

public interface IReportService
{
    Task<List<ReportDto>> GetReportsAsync();
}