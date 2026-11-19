using CyberShield.API.DTOs;
using CyberShield.API.Helpers;
using CyberShield.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/virustotal")]
public class VirusTotalController : ControllerBase
{
    private readonly IVirusTotalService _virusTotalService;

    public VirusTotalController(IVirusTotalService virusTotalService)
    {
        _virusTotalService = virusTotalService;
    }

    [HttpPost]
    public async Task<ActionResult<VirusTotalResponseDto>> AnalyzeUrl([FromBody] VirusTotalRequestDto request)
    {
        if (request == null || !UrlValidator.IsValidUrl(request.Url))
        {
            return BadRequest(new { message = "A URL informada é inválida ou está vazia. Certifique-se de incluir http:// ou https://." });
        }

        var result = await _virusTotalService.AnalyzeUrlAsync(request.Url);
        return Ok(result);
    }
}