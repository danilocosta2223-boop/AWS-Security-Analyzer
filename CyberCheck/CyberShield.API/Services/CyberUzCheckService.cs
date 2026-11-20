// ==========================================
// BLOCO 01: Imports e Namespace
// ==========================================
using System.Net.Http.Json;
using System.Text.Json;
using CyberShield.API.Interfaces;

namespace CyberShield.API.Services;

// ==========================================
// BLOCO 02: Implementacao do Servico CyberUzCheck
// ==========================================
public class CyberUzCheckService : ICyberUzCheckService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "email",
        "hash",
        "headers",
        "password",
        "url"
    };

    public CyberUzCheckService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _baseUrl = (configuration["CyberUzCheck:BaseUrl"] ?? "https://aws-security-analyzer-6ayz.onrender.com").TrimEnd('/');
    }

    // ==========================================
    // BLOCO 03: Envio da Requisicao POST /api/check
    // ==========================================
    public async Task<JsonElement> CheckAsync(string type, string value, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(type) || !AllowedTypes.Contains(type.Trim()))
        {
            throw new ArgumentException("Tipo invalido. Use: email, hash, headers, password ou url.");
        }

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("O campo value e obrigatorio.");
        }

        var endpoint = $"{_baseUrl}/api/check";
        var payload = new
        {
            type = type.Trim().ToLowerInvariant(),
            value = value.Trim()
        };

        using var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Erro ao consultar CyberUzCheck ({(int)response.StatusCode}): {rawContent}");
        }

        using var document = JsonDocument.Parse(rawContent);
        return document.RootElement.Clone();
    }
}