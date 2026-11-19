using CyberShield.API.DTOs;

namespace CyberShield.API.Interfaces;

public interface IHistoryService
{
    Task<List<HistoryDto>> GetHistoryAsync();
}