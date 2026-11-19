using CyberShield.API.DTOs;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

public class DashboardService : IDashboardService
{
    public async Task<DashboardDto> GetDashboardAsync()
    {
        await Task.Delay(100);

        return new DashboardDto
        {
            Status = "online",
            TotalScans = 0,
            TotalReports = 0,
            LatestScan = "Nenhum"
        };
    }
}