using System.Text.Json.Serialization;
using CyberShield.API.Database;
using CyberShield.API.Helpers;
using Microsoft.EntityFrameworkCore;

// ==========================================
// 1. Builder & Configuração de Serviços
// ==========================================
var builder = WebApplication.CreateBuilder(args);

// Porta dinâmica para Render (PORT) ou porta fixa 5287 em desenvolvimento local
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
else
{
    builder.WebHost.UseUrls("http://localhost:5287");
}

// Controllers e serialização JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();

// Banco de dados SQLite (CyberCheckContext)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=cybershield.db";

builder.Services.AddDbContext<CyberCheckContext>(options =>
    options.UseSqlite(connectionString));

// HttpClient e Helper para chamadas HTTP externas
builder.Services.AddHttpClient();
builder.Services.AddScoped<HttpClientHelper>();

// Política de CORS para Frontend Local (Live Server) e Produção (Vercel / Domínio)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CyberCheckCors", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin)) return false;

                if (origin is "http://127.0.0.1:5500"
                    or "http://localhost:5500"
                    or "http://localhost:3000"
                    or "https://cybercheck.com")
                {
                    return true;
                }

                return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                       && uri.Scheme == Uri.UriSchemeHttps
                       && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ==========================================
// 2. Pipeline HTTP e Middlewares
// ==========================================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors("CyberCheckCors");

app.UseAuthorization();

// Endpoint de Health Check (/api/health)
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    application = "Cyber Shield API",
    timestamp = DateTime.UtcNow
}));

// Mapeia os controllers (/api/audit, /api/virustotal, etc.)
app.MapControllers();

// ==========================================
// 3. Inicialização da Aplicação
// ==========================================
app.Run();