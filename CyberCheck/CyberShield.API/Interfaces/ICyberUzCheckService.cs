// ==========================================
// BLOCO 01: Imports e Namespace
// ==========================================
using System.Text.Json;

namespace CyberShield.API.Interfaces;

// ==========================================
// BLOCO 02: Contrato do Servico CyberUzCheck
// ==========================================
public interface ICyberUzCheckService
{
    Task<JsonElement> CheckAsync(string type, string value, CancellationToken cancellationToken = default);
}