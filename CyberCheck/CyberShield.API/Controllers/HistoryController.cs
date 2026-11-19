using CyberShield.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/history")]
public class HistoryController : ControllerBase
{
    private readonly IHistoryService _historyService;

    public HistoryController(
        IHistoryService historyService)
    {
        _historyService = historyService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result =
            await _historyService.GetHistoryAsync();

        return Ok(result);
    }
}