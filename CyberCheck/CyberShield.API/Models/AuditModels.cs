using System.Text.Json.Serialization;

namespace CyberShield.Api.Models;

public sealed class AuditRequestDto
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

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