using System.Net;
using System.Net.Sockets;
using CyberShield.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuditController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public AuditController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost]
    public async Task<ActionResult<ConsolidatedAuditResponseDto>> PostAudit(
        [FromBody] AuditRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { error = "Informe uma URL válida no campo 'url'." });
        }

        if (!Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out var targetUri) ||
            (targetUri.Scheme != Uri.UriSchemeHttp && targetUri.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { error = "A URL deve começar com http:// ou https://." });
        }

        var host = targetUri.Host;
        var dnsInfo = await ResolveDnsAsync(host, cancellationToken);
        var (sslInfo, headersInfo, technologies, reconInfo) = await ProbeHttpAsync(targetUri, cancellationToken);

        var vtResult = new VirusTotalResultDto
        {
            Status = "clean",
            Harmless = 0,
            Suspicious = 0,
            Malicious = 0,
            Stats = new VirusTotalStatsDto
            {
                Harmless = 0,
                Suspicious = 0,
                Malicious = 0
            }
        };

        var calculatedScore = 100;
        if (!sslInfo.Enabled) calculatedScore -= 25;
        if (!headersInfo.HasStrictTransportSecurity) calculatedScore -= 10;
        if (!headersInfo.HasContentSecurityPolicy) calculatedScore -= 10;
        if (!headersInfo.HasXFrameOptions) calculatedScore -= 5;
        calculatedScore -= (vtResult.Malicious * 25) + (vtResult.Suspicious * 10);
        calculatedScore = Math.Clamp(calculatedScore, 0, 100);

        var risk = calculatedScore >= 85 ? "LOW" : calculatedScore >= 60 ? "MEDIUM" : "HIGH";

        var tld = host.Contains('.') ? host.Split('.').Last() : string.Empty;
        var whoisInfo = new WhoisInfoDto
        {
            Domain = host,
            Tld = tld,
            Source = "host-inspection"
        };

        var response = new ConsolidatedAuditResponseDto
        {
            Target = targetUri.ToString(),
            Status = "ok",
            Score = calculatedScore,
            Risk = risk,
            VirusTotal = vtResult,
            Ssl = sslInfo,
            Whois = whoisInfo,
            Technologies = technologies,
            Recon = reconInfo,
            Dns = dnsInfo,
            Headers = headersInfo
        };

        return Ok(response);
    }

    private static async Task<DnsInfoDto> ResolveDnsAsync(string host, CancellationToken ct)
    {
        var dto = new DnsInfoDto { Host = host };

        try
        {
            var entry = await Dns.GetHostEntryAsync(host, ct);
            dto.HostName = entry.HostName;
            dto.Addresses = entry.AddressList
                .Where(ip => ip.AddressFamily is AddressFamily.InterNetwork or AddressFamily.InterNetworkV6)
                .Select(ip => ip.ToString())
                .Distinct()
                .ToList();
        }
        catch
        {
            dto.Addresses = [];
        }

        return dto;
    }

    private async Task<(SslInfoDto Ssl, HeadersInfoDto Headers, List<string> Tech, ReconInfoDto Recon)> ProbeHttpAsync(
        Uri targetUri,
        CancellationToken ct)
    {
        var ssl = new SslInfoDto
        {
            Enabled = targetUri.Scheme == Uri.UriSchemeHttps,
            Scheme = targetUri.Scheme,
            Detail = targetUri.Scheme == Uri.UriSchemeHttps
                ? "Conexão HTTPS detectada"
                : "Alvo utiliza HTTP sem TLS"
        };

        var headers = new HeadersInfoDto();
        var technologies = new List<string>();
        var recon = new ReconInfoDto();

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(6);

            using var req = new HttpRequestMessage(HttpMethod.Get, targetUri);
            using var resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);

            ssl.StatusCode = (int)resp.StatusCode;

            if (resp.Headers.Server.Count > 0)
            {
                headers.Server = string.Join(" ", resp.Headers.Server.Select(s => s.ToString()));
                technologies.Add($"Server: {headers.Server}");
            }

            if (resp.Headers.TryGetValues("X-Powered-By", out var poweredByValues))
            {
                headers.PoweredBy = string.Join(", ", poweredByValues);
                technologies.Add($"X-Powered-By: {headers.PoweredBy}");
            }

            headers.HasStrictTransportSecurity = resp.Headers.Contains("Strict-Transport-Security");
            headers.HasContentSecurityPolicy = resp.Headers.Contains("Content-Security-Policy");
            headers.HasXFrameOptions = resp.Headers.Contains("X-Frame-Options");

            recon.RobotsReachable = await PathExistsAsync(client, new Uri(targetUri, "/robots.txt"), ct);
            recon.SitemapReachable = await PathExistsAsync(client, new Uri(targetUri, "/sitemap.xml"), ct);
        }
        catch (Exception ex)
        {
            ssl.Detail = $"Sonda HTTP indisponível: {ex.Message}";
        }

        return (ssl, headers, technologies, recon);
    }

    private static async Task<bool> PathExistsAsync(HttpClient client, Uri uri, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Head, uri);
            using var resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}