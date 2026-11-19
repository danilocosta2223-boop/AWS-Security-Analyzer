using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace CyberShield.API.Helpers;

public sealed class HttpClientHelper
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<HttpClientHelper> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public HttpClientHelper(HttpClient httpClient, ILogger<HttpClientHelper> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<TResponse?> GetAsync<TResponse>(string requestUri, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Enviando requisicao GET para {Uri}", requestUri);
            var response = await _httpClient.GetAsync(requestUri, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha ao obter dados de {Uri}. Status: {StatusCode}", requestUri, response.StatusCode);
                return default;
            }

            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado ao consultar {Uri}", requestUri);
            return default;
        }
    }

    public async Task<TResponse?> PostAsync<TRequest, TResponse>(string requestUri, TRequest payload, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Enviando requisicao POST para {Uri}", requestUri);
            var response = await _httpClient.PostAsJsonAsync(requestUri, payload, JsonOptions, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha no POST para {Uri}. Status: {StatusCode}", requestUri, response.StatusCode);
                return default;
            }

            return await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado no POST para {Uri}", requestUri);
            return default;
        }
    }

    public async Task<string> GetRawStringAsync(string requestUri, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _httpClient.GetStringAsync(requestUri, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter string de {Uri}", requestUri);
            return string.Empty;
        }
    }
}