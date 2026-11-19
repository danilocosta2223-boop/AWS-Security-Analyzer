using CyberShield.API.DTOs;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

public class ReportService : IReportService
{
    public async Task<List<ReportDto>> GetReportsAsync()
    {
        await Task.Delay(100);

        return new List<ReportDto>
        {
            new()
            {
                Id = 1,
                Title = "Auditoria de Segurança - Google",
                Format = "PDF",
                CreatedAt = DateTime.UtcNow
            }
        };
    }
}