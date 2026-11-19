namespace CyberShield.API.Models;

public class SitemapInfo
{
    public string Url { get; set; } = string.Empty;
    public int TotalLinksFound { get; set; }
    public bool IsAccessible { get; set; }
}