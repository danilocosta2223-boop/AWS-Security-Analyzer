using CyberShield.API.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/auditoria")]
public class AuditoriaController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "online",
            sistema = "Cyber Shield"
        });
    }

    [HttpPost]
    public IActionResult Audit([FromBody] AuditRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { message = "A URL informada é inválida ou está vazia." });
        }

        var result = new AuditResponseDto
        {
            Url = request.Url,
            Score = 90,
            Risk = "LOW",
            SslValid = true,
            ScanDate = DateTime.UtcNow
        };

        return Ok(result);
    }
}