// ==========================================
// BLOCO 01: Imports
// ==========================================
using System.Text.Json.Serialization;
using CyberShield.API.Database;
using CyberShield.API.Helpers;
using CyberShield.API.Interfaces;
using CyberShield.API.Services;
using Microsoft.EntityFrameworkCore;

// ==========================================
// BLOCO 02: Builder & Configuracao de Servicos
// ==========================================
var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
else
{
    builder.WebHost.UseUrls("http://localhost:5287");
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=cybershield.db";

builder.Services.AddDbContext<CyberCheckContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddHttpClient();
builder.Services.AddScoped<HttpClientHelper>();
builder.Services.AddHttpClient<ICyberUzCheckService, CyberUzCheckService>();

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
// BLOCO 03: Pipeline HTTP e Middlewares
// ==========================================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CyberCheckCors");
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    application = "Cyber Shield API",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

// ==========================================
// BLOCO 04: Inicializacao da Aplicacao
// ==========================================
app.Run();