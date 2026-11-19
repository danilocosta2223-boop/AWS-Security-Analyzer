using System.Net;

namespace CyberShield.API.Helpers;

public static class UrlValidator
{
    public static bool IsValidUrl(string? url, bool allowLocalhost = true)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        var candidate = url.Trim();

        // Se o usuário digitar apenas o domínio (ex.: google.com), normaliza para https://
        if (!candidate.Contains("://", StringComparison.Ordinal))
        {
            candidate = $"https://{candidate}";
        }

        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uriResult))
        {
            return false;
        }

        var isHttpOrHttps = uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps;
        if (!isHttpOrHttps || string.IsNullOrWhiteSpace(uriResult.Host))
        {
            return false;
        }

        if (!allowLocalhost && IsLocalOrLoopbackHost(uriResult.Host))
        {
            return false;
        }

        return true;
    }

    public static bool TryNormalizeUrl(string? rawUrl, out string normalizedUrl, bool allowLocalhost = true)
    {
        normalizedUrl = string.Empty;

        if (!IsValidUrl(rawUrl, allowLocalhost))
        {
            return false;
        }

        var candidate = rawUrl!.Trim();
        if (!candidate.Contains("://", StringComparison.Ordinal))
        {
            candidate = $"https://{candidate}";
        }

        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uriResult))
        {
            return false;
        }

        normalizedUrl = uriResult.ToString();
        return true;
    }

    private static bool IsLocalOrLoopbackHost(string host)
    {
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (IPAddress.TryParse(host, out var ip))
        {
            return IPAddress.IsLoopback(ip);
        }

        return false;
    }
}