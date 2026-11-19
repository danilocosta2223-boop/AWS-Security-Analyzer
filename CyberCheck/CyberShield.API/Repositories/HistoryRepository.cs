using CyberShield.API.Database;
using CyberShield.API.DTOs;
using CyberShield.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CyberShield.API.Repositories;

public class HistoryRepository
{
    private readonly CyberCheckContext _context;

    public HistoryRepository(CyberCheckContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<HistoryDto>> GetAllAsync()
    {
        return await _context.ScanHistories
            .Select(s => new HistoryDto
            {
                Id = s.Id,
                Target = s.Target,
                Score = s.Score,
                ScanDate = s.ScanDate
            })
            .ToListAsync();
    }

    public async Task AddAsync(string target, int score)
    {
        var history = new ScanHistory
        {
            Target = target,
            Score = score,
            ScanDate = DateTime.UtcNow
        };

        _context.ScanHistories.Add(history);
        await _context.SaveChangesAsync();
    }
}