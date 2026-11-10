from services.sitemap_analyzer import analyze_sitemap

resultado = analyze_sitemap(
    "https://www.microsoft.com"
)

print(resultado)