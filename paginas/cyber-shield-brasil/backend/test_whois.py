from integrations.whois_lookup import (
    analyze_whois
)

resultado = analyze_whois(
    "https://www.google.com"
)

print(resultado)