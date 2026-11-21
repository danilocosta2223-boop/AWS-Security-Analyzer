// ==========================================
// BLOCO 01: Imports e Namespace
// ==========================================
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using CyberShield.API.Models;

namespace CyberShield.API.Services;

// ==========================================
// BLOCO 02: Construtor e Normalizacao de URL
// ==========================================
public sealed class RealAuditService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RealAuditService> _logger;

    public RealAuditService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<RealAuditService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public static string NormalizeUrl(string rawUrl)
    {
        var trimmed = (rawUrl ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ArgumentException("URL ou dominio obrigatorio.");

        if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = $"https://{trimmed}";
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) || string.IsNullOrWhiteSpace(uri.Host))
            throw new ArgumentException("URL invalida.");

        return uri.ToString();
    }

    // ==========================================
    // BLOCO 03: Execucao em Streaming e Consolidada
    // ==========================================
    public async IAsyncEnumerable<AuditStepEvent> RunStreamingAuditAsync(
        string rawUrl,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var normalizedUrl = NormalizeUrl(rawUrl);
        var uri = new Uri(normalizedUrl);
        var host = uri.Host;
        var currentScore = 0;

        var sslResult = await CheckSslAsync(host, ct);
        var sslScore = sslResult.Valid ? 20 : 0;
        currentScore += sslScore;
        yield return new AuditStepEvent(
            "SSL",
            sslResult.Valid ? "OK" : "FALHA",
            sslScore,
            currentScore,
            sslResult.Detail
        );

        var headersReport = await CheckSecurityHeadersAsync(normalizedUrl, ct);
        currentScore += headersReport.Score;
        yield return new AuditStepEvent(
            "HEADERS",
            headersReport.Score >= 15 ? "OK" : "PARCIAL",
            headersReport.Score,
            currentScore,
            $"HSTS={headersReport.Hsts}, CSP={headersReport.Csp}, XFO={headersReport.XFrameOptions}"
        );

        var dnsReport = await CheckDnsAndEmailSecurityAsync(host, ct);
        currentScore += dnsReport.Score;
        yield return new AuditStepEvent(
            "DNS",
            dnsReport.Resolved ? "OK" : "FALHA",
            dnsReport.Score,
            currentScore,
            $"IP={dnsReport.ResolvedIp ?? "N/A"}, SPF={dnsReport.Spf}, DMARC={dnsReport.Dmarc}"
        );

        var whoisReport = await CheckWhoisAsync(host, dnsReport.ResolvedIp, ct);
        currentScore += whoisReport.Score;
        yield return new AuditStepEvent(
            "WHOIS",
            whoisReport.Reachable ? "OK" : "LIMITADO",
            whoisReport.Score,
            currentScore,
            whoisReport.RegistrarHint ?? $"Dominio {host} verificado"
        );

        var reconReport = await CheckReconAndGeoAsync(uri, dnsReport.ResolvedIp, ct);
        currentScore += reconReport.Score;
        yield return new AuditStepEvent(
            "RECON",
            reconReport.RobotsTxt || reconReport.SitemapXml ? "OK" : "BASICO",
            reconReport.Score,
            currentScore,
            $"Robots={reconReport.RobotsTxt}, Sitemap={reconReport.SitemapXml}, Pais={reconReport.GeoCountry ?? "N/A"}"
        );

        var vtReport = await CheckVirusTotalAsync(normalizedUrl, ct);
        currentScore = Math.Clamp(currentScore + vtReport.Score, 0, 100);
        yield return new AuditStepEvent(
            "VIRUSTOTAL",
            vtReport.Malicious == 0 ? "OK" : "ALERTA",
            vtReport.Score,
            currentScore,
            vtReport.Summary
        );
    }

    public async Task<AuditFinalResult> BuildFinalResultAsync(string rawUrl, CancellationToken ct = default)
    {
        var normalizedUrl = NormalizeUrl(rawUrl);
        var uri = new Uri(normalizedUrl);
        var host = uri.Host;

        var dnsReport = await CheckDnsAndEmailSecurityAsync(host, ct);

        var sslTask = CheckSslAsync(host, ct);
        var headersTask = CheckSecurityHeadersAsync(normalizedUrl, ct);
        var whoisTask = CheckWhoisAsync(host, dnsReport.ResolvedIp, ct);
        var reconTask = CheckReconAndGeoAsync(uri, dnsReport.ResolvedIp, ct);
        var vtTask = CheckVirusTotalAsync(normalizedUrl, ct);

        await Task.WhenAll(sslTask, headersTask, whoisTask, reconTask, vtTask);

        var sslResult = await sslTask;
        var headersReport = await headersTask;
        var whoisReport = await whoisTask;
        var reconReport = await reconTask;
        var vtReport = await vtTask;

        var sslScore = sslResult.Valid ? 20 : 0;
        var totalScore = Math.Clamp(
            sslScore +
            headersReport.Score +
            dnsReport.Score +
            whoisReport.Score +
            reconReport.Score +
            vtReport.Score,
            0,
            100
        );

        var grade = totalScore >= 90 ? "A"
            : totalScore >= 80 ? "B"
            : totalScore >= 65 ? "C"
            : totalScore >= 50 ? "D" : "F";

        var risk = totalScore >= 80 ? "LOW"
            : totalScore >= 50 ? "MEDIUM" : "HIGH";

        var recommendations = new List<string>();
        if (!sslResult.Valid)
            recommendations.Add("CRITICO: Configurar certificado SSL/TLS valido na porta 443.");
        if (!headersReport.Hsts)
            recommendations.Add("ALTO: Habilitar Strict-Transport-Security (HSTS) com max-age adequado.");
        if (!headersReport.Csp)
            recommendations.Add("CRITICO: Adicionar Content-Security-Policy (CSP) para reduzir risco de XSS.");
        if (!headersReport.XFrameOptions)
            recommendations.Add("MEDIO: Adicionar X-Frame-Options: DENY ou SAMEORIGIN contra clickjacking.");
        if (!dnsReport.Spf)
            recommendations.Add("ALTO: Publicar registro TXT SPF para autorizar remetentes de e-mail.");
        if (!dnsReport.Dmarc)
            recommendations.Add("ALTO: Publicar registro TXT _dmarc para politicas de autenticacao de e-mail.");
        if (vtReport.Malicious > 0)
            recommendations.Add("CRITICO: Investigar deteccoes maliciosas reportadas no VirusTotal.");

        return new AuditFinalResult(
            Url: normalizedUrl,
            Domain: host,
            Score: totalScore,
            Grade: grade,
            Risk: risk,
            ScanDate: DateTime.UtcNow,
            SslValid: sslResult.Valid,
            SslScore: sslScore,
            Headers: headersReport,
            Dns: dnsReport,
            Whois: whoisReport,
            Recon: reconReport,
            VirusTotal: vtReport,
            Recommendations: recommendations
        );
    }

    // ==========================================
    // BLOCO 04: Verificacoes SSL, Headers e DNS
    // ==========================================
    private async Task<(bool Valid, string Detail)> CheckSslAsync(string host, CancellationToken ct)
    {
        try
        {
            using var tcpClient = new TcpClient();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(6));

            await tcpClient.ConnectAsync(host, 443, timeoutCts.Token);

            await using var sslStream = new SslStream(
                tcpClient.GetStream(),
                false,
                (_, _, _, errors) => errors == SslPolicyErrors.None
            );

            await sslStream.AuthenticateAsClientAsync(host);
            string validUntil = "valido";
            if (sslStream.RemoteCertificate != null)
            {
                using var cert = new X509Certificate2(sslStream.RemoteCertificate);
                validUntil = cert.NotAfter.ToString("yyyy-MM-dd");
            }

            return (true, $"TLS ativo na porta 443 (Valido ate {validUntil})");
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Falha SSL para {Host}", host);
            return (false, $"SSL/TLS indisponivel ou invalido em {host}");
        }
    }

    private async Task<SecurityHeadersReport> CheckSecurityHeadersAsync(string url, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("AuditClient");
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);

            bool HasHeader(string name) =>
                response.Headers.Contains(name) || response.Content.Headers.Contains(name);

            var hsts = HasHeader("Strict-Transport-Security");
            var csp = HasHeader("Content-Security-Policy");
            var xfo = HasHeader("X-Frame-Options");
            var xcto = HasHeader("X-Content-Type-Options");
            var refPol = HasHeader("Referrer-Policy");

            var score = 0;
            if (hsts) score += 7;
            if (csp) score += 7;
            if (xfo) score += 4;
            if (xcto) score += 4;
            if (refPol) score += 3;

            return new SecurityHeadersReport(hsts, csp, xfo, xcto, refPol, score);
        }
        catch
        {
            return new SecurityHeadersReport(false, false, false, false, false, 0);
        }
    }

    private async Task<DnsSecurityReport> CheckDnsAndEmailSecurityAsync(string host, CancellationToken ct)
    {
        try
        {
            var entry = await Dns.GetHostEntryAsync(host, ct);
            var ip = entry.AddressList.FirstOrDefault()?.ToString();
            var resolved = !string.IsNullOrWhiteSpace(ip);

            var client = _httpClientFactory.CreateClient("AuditClient");
            var txtRecords = await QueryDohTxtAsync(client, host, ct);
            var spf = txtRecords.Any(t => t.Contains("v=spf1", StringComparison.OrdinalIgnoreCase));

            var dmarcRecords = await QueryDohTxtAsync(client, $"_dmarc.{host}", ct);
            var dmarc = dmarcRecords.Any(t => t.Contains("v=dmarc1", StringComparison.OrdinalIgnoreCase));

            var dkimRecords = await QueryDohTxtAsync(client, $"default._domainkey.{host}", ct);
            var dkimHint = dkimRecords.Count > 0;

            var score = 0;
            if (resolved) score += 10;
            if (spf) score += 6;
            if (dmarc) score += 6;
            if (dkimHint) score += 3;

            return new DnsSecurityReport(resolved, spf, dmarc, dkimHint, ip, score);
        }
        catch
        {
            return new DnsSecurityReport(false, false, false, false, null, 0);
        }
    }

    private static async Task<List<string>> QueryDohTxtAsync(HttpClient client, string name, CancellationToken ct)
    {
        var results = new List<string>();
        try
        {
            var url = $"https://dns.google/resolve?name={Uri.EscapeDataString(name)}&type=TXT";
            using var res = await client.GetAsync(url, ct);
            if (!res.IsSuccessStatusCode) return results;

            await using var stream = await res.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("Answer", out var answers) && answers.ValueKind == JsonValueKind.Array)
            {
                foreach (var ans in answers.EnumerateArray())
                {
                    if (ans.TryGetProperty("data", out var dataProp))
                    {
                        results.Add(dataProp.GetString() ?? string.Empty);
                    }
                }
            }
        }
        catch
        {
            // Ignora erro de consulta TXT individual
        }
        return results;
    }

    // ==========================================
    // BLOCO 05: Verificacoes WHOIS, Recon e VirusTotal
    // ==========================================
    private async Task<WhoisReport> CheckWhoisAsync(string host, string? ip, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("AuditClient");
            var rdapUrl = $"https://rdap.org/domain/{Uri.EscapeDataString(host)}";
            using var res = await client.GetAsync(rdapUrl, ct);
            if (res.IsSuccessStatusCode)
            {
                return new WhoisReport(host, true, $"RDAP ativo (IP: {ip ?? "N/A"})", 5);
            }
        }
        catch
        {
            // Fallback
        }
        return new WhoisReport(host, !string.IsNullOrWhiteSpace(ip), $"IP: {ip ?? "N/A"}", !string.IsNullOrWhiteSpace(ip) ? 3 : 0);
    }

    private async Task<ReconReport> CheckReconAndGeoAsync(Uri uri, string? ip, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("AuditClient");
        var robots = false;
        var sitemap = false;
        string? serverHeader = null;
        string? country = null;

        try
        {
            using var headRes = await client.GetAsync(uri.ToString(), HttpCompletionOption.ResponseHeadersRead, ct);
            serverHeader = headRes.Headers.Server.ToString();
        }
        catch { }

        try
        {
            using var rRes = await client.GetAsync($"{uri.Scheme}://{uri.Host}/robots.txt", ct);
            robots = rRes.IsSuccessStatusCode;
        }
        catch { }

        try
        {
            using var sRes = await client.GetAsync($"{uri.Scheme}://{uri.Host}/sitemap.xml", ct);
            sitemap = sRes.IsSuccessStatusCode;
        }
        catch { }

        if (!string.IsNullOrWhiteSpace(ip))
        {
            try
            {
                using var geoRes = await client.GetAsync($"https://ipapi.co/{ip}/country_name/", ct);
                if (geoRes.IsSuccessStatusCode)
                {
                    country = (await geoRes.Content.ReadAsStringAsync(ct)).Trim();
                }
            }
            catch { }
        }

        var score = 0;
        if (robots) score += 4;
        if (sitemap) score += 4;
        if (!string.IsNullOrWhiteSpace(country)) score += 2;

        return new ReconReport(robots, sitemap, string.IsNullOrWhiteSpace(serverHeader) ? null : serverHeader, country, score);
    }

    private async Task<VirusTotalReport> CheckVirusTotalAsync(string normalizedUrl, CancellationToken ct)
    {
        var apiKey = _configuration["VirusTotal:ApiKey"] ?? Environment.GetEnvironmentVariable("VIRUSTOTAL_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new VirusTotalReport(false, 0, 0, "API key VT nao configurada (score neutro)", 10);
        }

        try
        {
            var client = _httpClientFactory.CreateClient("AuditClient");
            var urlId = Convert.ToBase64String(Encoding.UTF8.GetBytes(normalizedUrl))
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');

            using var request = new HttpRequestMessage(HttpMethod.Get, $"https://www.virustotal.com/api/v3/urls/{urlId}");
            request.Headers.Add("x-apikey", apiKey);

            using var res = await client.SendAsync(request, ct);
            if (!res.IsSuccessStatusCode)
            {
                return new VirusTotalReport(true, 0, 0, $"Sem historico previo no VT (HTTP {(int)res.StatusCode})", 12);
            }

            await using var stream = await res.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var stats = doc.RootElement
                .GetProperty("data")
                .GetProperty("attributes")
                .GetProperty("last_analysis_stats");

            var malicious = stats.TryGetProperty("malicious", out var m) ? m.GetInt32() : 0;
            var suspicious = stats.TryGetProperty("suspicious", out var s) ? s.GetInt32() : 0;

            if (malicious > 0)
            {
                var penalty = -Math.Min(40, malicious * 10);
                return new VirusTotalReport(true, malicious, suspicious, $"{malicious} deteccoes maliciosas no VT", penalty);
            }

            return new VirusTotalReport(true, 0, suspicious, $"0 maliciosos, {suspicious} suspeitos", 15);
        }
        catch
        {
            return new VirusTotalReport(false, 0, 0, "Falha ao consultar VirusTotal", 10);
        }
    }
}