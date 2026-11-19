using System.Text.Json.Serialization;
using CyberShield.API.Database;
using CyberShield.API.Helpers;
using Microsoft.EntityFrameworkCore;

// ==========================================
// 1. Builder & Configuração de Serviços
// ==========================================
var builder = WebApplication.CreateBuilder(args);

// Escuta limpa em HTTP na porta 5287
builder.WebHost.UseUrls("http://localhost:5287");

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

// Política de CORS para o Frontend (Live Server e localhost)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CyberCheckCors", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://localhost:3000"
            )
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