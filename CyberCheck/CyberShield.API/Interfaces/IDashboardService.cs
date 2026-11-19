using CyberShield.API.DTOs;

namespace CyberShield.API.Interfaces;

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync();
}