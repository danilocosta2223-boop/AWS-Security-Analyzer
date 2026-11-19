using System.Net;

namespace CyberShield.API.Helpers;

public static class DomainExtractor
{
    public static string ExtractHost(string? rawInput)
    {
        if (string.IsNullOrWhiteSpace(rawInput))
        {
            return string.Empty;
        }

        var trimmed = rawInput.Trim();

        if (!trimmed.Contains("://", StringComparison.Ordinal))
        {
            trimmed = $"https://{trimmed}";
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) || string.IsNullOrWhiteSpace(uri.Host))
        {
            return string.Empty;
        }

        return uri.IdnHost.Trim().TrimEnd('.').ToLowerInvariant();
    }

    public static string ExtractRootDomain(string? rawInput)
    {
        var host = ExtractHost(rawInput);
        if (string.IsNullOrWhiteSpace(host))
        {
            return string.Empty;
        }

        if (IPAddress.TryParse(host, out _))
        {
            return host;
        }

        var parts = host.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 2)
        {
            return host;
        }

        var lastTwo = $"{parts[^2]}.{parts[^1]}";
        var compoundPublicSuffixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "com.br", "net.br", "org.br", "gov.br", "edu.br",
            "co.uk", "org.uk", "ac.uk", "com.au", "com.ar"
        };

        if (compoundPublicSuffixes.Contains(lastTwo) && parts.Length >= 3)
        {
            return $"{parts[^3]}.{lastTwo}";
        }

        return lastTwo;
    }

    public static string ExtractTld(string? rawInput)
    {
        var host = ExtractHost(rawInput);
        if (string.IsNullOrWhiteSpace(host) || IPAddress.TryParse(host, out _))
        {
            return string.Empty;
        }

        var lastDotIndex = host.LastIndexOf('.');
        return lastDotIndex >= 0 && lastDotIndex < host.Length - 1
            ? host[(lastDotIndex + 1)..]
            : string.Empty;
    }
}