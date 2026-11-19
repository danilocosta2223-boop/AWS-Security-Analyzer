using Microsoft.AspNetCore.Mvc;

namespace CyberShield.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            application = "Cyber Shield API",
            timestamp = DateTime.UtcNow
        });
    }
}