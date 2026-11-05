from services.headers_analyzer import analyze_headers

resultado = analyze_headers(
    "https://www.microsoft.com"
)

print(resultado)