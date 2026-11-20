// ==========================================
// BLOCO 01: Imports e Namespace
// ==========================================
using CyberShield.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

// ==========================================
// BLOCO 02: DTO de Entrada
// ==========================================
public class CyberUzCheckRequest
{
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

// ==========================================
// BLOCO 03: Controller /api/cyberuzcheck
// ==========================================
[ApiController]
[Route("api/[controller]")]
public class CyberUzCheckController : ControllerBase
{
    private readonly ICyberUzCheckService _cyberUzCheckService;

    public CyberUzCheckController(ICyberUzCheckService cyberUzCheckService)
    {
        _cyberUzCheckService = cyberUzCheckService;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CyberUzCheckRequest request, CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Corpo da requisicao invalido." });
        }

        try
        {
            var result = await _cyberUzCheckService.CheckAsync(request.Type, request.Value, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }
}