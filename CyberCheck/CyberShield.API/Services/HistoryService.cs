using CyberShield.API.DTOs;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

public class HistoryService : IHistoryService
{
    public async Task<List<HistoryDto>> GetHistoryAsync()
    {
        await Task.Delay(100);

        return new List<HistoryDto>
        {
            new()
            {
                Id = 1,
                Target = "google.com",
                Score = 95,
                ScanDate = DateTime.UtcNow
            }
        };
    }
}