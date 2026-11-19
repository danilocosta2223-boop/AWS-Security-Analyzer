using CyberShield.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly ReportRepository _reportRepository;

    public ReportsController(ReportRepository reportRepository)
    {
        _reportRepository = reportRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetReports()
    {
        var summary = await _reportRepository.GetSummaryReportAsync();
        return Ok(summary);
    }
}