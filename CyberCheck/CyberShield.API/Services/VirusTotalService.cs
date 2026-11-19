using System.Text;
using System.Text.Json;
using CyberShield.API.DTOs;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

public class VirusTotalService : IVirusTotalService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public VirusTotalService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;

        // Lê a chave da API configurada no appsettings.json ou variáveis de ambiente
        var apiKey = _configuration["VirusTotal:ApiKey"];

        _httpClient.BaseAddress = new Uri("https://www.virustotal.com/api/v3/");
        _httpClient.DefaultRequestHeaders.Add("x-apikey", apiKey);
    }

    public async Task<VirusTotalResponseDto> AnalyzeUrlAsync(string url)
    {
        // O VirusTotal v3 exige que a URL seja codificada em Base64 URL-safe (sem padding, substituindo caracteres)
        var encodedUrl = Convert.ToBase64String(Encoding.UTF8.GetBytes(url))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var response = await _httpClient.GetAsync($"urls/{encodedUrl}");

        if (!response.IsSuccessStatusCode)
        {
            return new VirusTotalResponseDto
            {
                Status = "not_found_or_error"
            };
        }

        var jsonResponse = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonResponse);
        var root = doc.RootElement;

        // Extrai as estatísticas de análise do retorno da API
        var stats = root.GetProperty("data")
                          .GetProperty("attributes")
                          .GetProperty("last_analysis_stats");

        int malicious = stats.GetProperty("malicious").GetInt32();
        int suspicious = stats.GetProperty("suspicious").GetInt32();
        int harmless = stats.GetProperty("harmless").GetInt32();

        string status = malicious > 0 ? "malicious" : (suspicious > 0 ? "suspicious" : "clean");

        return new VirusTotalResponseDto
        {
            Malicious = malicious,
            Suspicious = suspicious,
            Harmless = harmless,
            Status = status
        };
    }
}