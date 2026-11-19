using CyberShield.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly ReportRepository _reportRepository;

    public DashboardController(ReportRepository reportRepository)
    {
        _reportRepository = reportRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var summary = await _reportRepository.GetSummaryReportAsync();
        return Ok(summary);
    }
}