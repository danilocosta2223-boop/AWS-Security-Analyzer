using CyberShield.API.Database;
using CyberShield.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CyberShield.API.Repositories;

public class AuditRepository
{
    private readonly CyberCheckContext _context;

    public AuditRepository(CyberCheckContext context)
    {
        _context = context;
    }

    public async Task AddAuditAsync(string target, int score)
    {
        var audit = new ScanHistory
        {
            Target = target,
            Score = score,
            ScanDate = DateTime.UtcNow
        };

        _context.ScanHistories.Add(audit);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<ScanHistory>> GetRecentAuditsAsync()
    {
        return await _context.ScanHistories
            .OrderByDescending(s => s.ScanDate)
            .Take(10)
            .ToListAsync();
    }
}