using CyberShield.API.Database;
using CyberShield.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CyberShield.API.Repositories;

public class ReportRepository
{
    private readonly CyberCheckContext _context;

    public ReportRepository(CyberCheckContext context)
    {
        _context = context;
    }

    public async Task<object> GetSummaryReportAsync()
    {
        var totalScans = await _context.ScanHistories.CountAsync();

        var averageScore = totalScans > 0
            ? await _context.ScanHistories.AverageAsync(s => s.Score)
            : 0;

        return new
        {
            TotalScans = totalScans,
            AverageScore = Math.Round(averageScore, 2),
            GeneratedAt = DateTime.UtcNow
        };
    }
}