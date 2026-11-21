// ==========================================
// BLOCO 01: Imports e Namespace Unificado
// ==========================================
using System.Text.Json.Serialization;

namespace CyberShield.API.Models;

// ==========================================
// BLOCO 02: Requisicao e Eventos de Stream (SSE)
// ==========================================
public sealed class AuditRequestDto
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

public sealed record AuditStepEvent(
    [property: JsonPropertyName("step")] string Step,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("stepScore")] int StepScore,
    [property: JsonPropertyName("totalScore")] int TotalScore,
    [property: JsonPropertyName("detail")] string Detail
);

// ==========================================
// BLOCO 03: DTOs Detalhados por Modulo
// ==========================================
public sealed class VirusTotalStatsDto
{
    [JsonPropertyName("harmless")]
    public int Harmless { get; set; }

    [JsonPropertyName("suspicious")]
    public int Suspicious { get; set; }

    [JsonPropertyName("malicious")]
    public int Malicious { get; set; }
}

public sealed class VirusTotalResultDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "clean";

    [JsonPropertyName("harmless")]
    public int Harmless { get; set; }

    [JsonPropertyName("suspicious")]
    public int Suspicious { get; set; }

    [JsonPropertyName("malicious")]
    public int Malicious { get; set; }

    [JsonPropertyName("stats")]
    public VirusTotalStatsDto Stats { get; set; } = new();
}

public sealed class SslInfoDto
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    [JsonPropertyName("scheme")]
    public string Scheme { get; set; } = string.Empty;

    [JsonPropertyName("statusCode")]
    public int? StatusCode { get; set; }

    [JsonPropertyName("detail")]
    public string Detail { get; set; } = string.Empty;
}

public sealed class DnsInfoDto
{
    [JsonPropertyName("host")]
    public string Host { get; set; } = string.Empty;

    [JsonPropertyName("addresses")]
    public List<string> Addresses { get; set; } = [];

    [JsonPropertyName("hostName")]
    public string? HostName { get; set; }
}

public sealed class HeadersInfoDto
{
    [JsonPropertyName("server")]
    public string? Server { get; set; }

    [JsonPropertyName("poweredBy")]
    public string? PoweredBy { get; set; }

    [JsonPropertyName("hasStrictTransportSecurity")]
    public bool HasStrictTransportSecurity { get; set; }

    [JsonPropertyName("hasContentSecurityPolicy")]
    public bool HasContentSecurityPolicy { get; set; }

    [JsonPropertyName("hasXFrameOptions")]
    public bool HasXFrameOptions { get; set; }
}

public sealed class WhoisInfoDto
{
    [JsonPropertyName("domain")]
    public string Domain { get; set; } = string.Empty;

    [JsonPropertyName("tld")]
    public string Tld { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = "dns-lookup";
}

public sealed class ReconInfoDto
{
    [JsonPropertyName("robotsReachable")]
    public bool RobotsReachable { get; set; }

    [JsonPropertyName("sitemapReachable")]
    public bool SitemapReachable { get; set; }

    [JsonPropertyName("checkedPaths")]
    public List<string> CheckedPaths { get; set; } = ["/robots.txt", "/sitemap.xml"];
}

// ==========================================
// BLOCO 04: Relatorios Tecnicos de Seguranca
// ==========================================
public sealed record SecurityHeadersReport(
    [property: JsonPropertyName("hsts")] bool Hsts,
    [property: JsonPropertyName("csp")] bool Csp,
    [property: JsonPropertyName("xFrameOptions")] bool XFrameOptions,
    [property: JsonPropertyName("xContentTypeOptions")] bool XContentTypeOptions,
    [property: JsonPropertyName("referrerPolicy")] bool ReferrerPolicy,
    [property: JsonPropertyName("score")] int Score
);

public sealed record DnsSecurityReport(
    [property: JsonPropertyName("resolved")] bool Resolved,
    [property: JsonPropertyName("spf")] bool Spf,
    [property: JsonPropertyName("dmarc")] bool Dmarc,
    [property: JsonPropertyName("dkimHint")] bool DkimHint,
    [property: JsonPropertyName("resolvedIp")] string? ResolvedIp,
    [property: JsonPropertyName("score")] int Score
);

public sealed record WhoisReport(
    [property: JsonPropertyName("domain")] string Domain,
    [property: JsonPropertyName("reachable")] bool Reachable,
    [property: JsonPropertyName("registrarHint")] string? RegistrarHint,
    [property: JsonPropertyName("score")] int Score
);

public sealed record ReconReport(
    [property: JsonPropertyName("robotsTxt")] bool RobotsTxt,
    [property: JsonPropertyName("sitemapXml")] bool SitemapXml,
    [property: JsonPropertyName("serverHeader")] string? ServerHeader,
    [property: JsonPropertyName("geoCountry")] string? GeoCountry,
    [property: JsonPropertyName("score")] int Score
);

public sealed record VirusTotalReport(
    [property: JsonPropertyName("checked")] bool Checked,
    [property: JsonPropertyName("malicious")] int Malicious,
    [property: JsonPropertyName("suspicious")] int Suspicious,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("score")] int Score
);

// ==========================================
// BLOCO 05: Respostas Consolidadas (API e Relatorio)
// ==========================================
public sealed class ConsolidatedAuditResponseDto
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "ok";

    [JsonPropertyName("score")]
    public int Score { get; set; } = 100;

    [JsonPropertyName("risk")]
    public string Risk { get; set; } = "LOW";

    [JsonPropertyName("virustotal")]
    public VirusTotalResultDto VirusTotal { get; set; } = new();

    [JsonPropertyName("ssl")]
    public SslInfoDto Ssl { get; set; } = new();

    [JsonPropertyName("whois")]
    public WhoisInfoDto Whois { get; set; } = new();

    [JsonPropertyName("technologies")]
    public List<string> Technologies { get; set; } = [];

    [JsonPropertyName("recon")]
    public ReconInfoDto Recon { get; set; } = new();

    [JsonPropertyName("dns")]
    public DnsInfoDto Dns { get; set; } = new();

    [JsonPropertyName("headers")]
    public HeadersInfoDto Headers { get; set; } = new();
}

public sealed record AuditFinalResult(
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("domain")] string Domain,
    [property: JsonPropertyName("score")] int Score,
    [property: JsonPropertyName("grade")] string Grade,
    [property: JsonPropertyName("risk")] string Risk,
    [property: JsonPropertyName("scanDate")] DateTime ScanDate,
    [property: JsonPropertyName("sslValid")] bool SslValid,
    [property: JsonPropertyName("sslScore")] int SslScore,
    [property: JsonPropertyName("headers")] SecurityHeadersReport Headers,
    [property: JsonPropertyName("dns")] DnsSecurityReport Dns,
    [property: JsonPropertyName("whois")] WhoisReport Whois,
    [property: JsonPropertyName("recon")] ReconReport Recon,
    [property: JsonPropertyName("virusTotal")] VirusTotalReport VirusTotal,
    [property: JsonPropertyName("recommendations")] List<string> Recommendations
);