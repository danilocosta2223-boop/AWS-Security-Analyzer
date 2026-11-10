from flask import Blueprint, request, jsonify
from urllib.parse import urlparse
import re

urls_bp = Blueprint("urls", __name__)


# ==========================================
# ROTA PRINCIPAL
# URL: /api/url/
# ==========================================
@urls_bp.route("/", methods=["GET"])
def urls():

    return jsonify({
        "module": "URL Analyzer",
        "status": "ready"
    })


# ==========================================
# ANALISADOR DE URL AVANÇADO
# URL: /api/url/analyze
# ==========================================
@urls_bp.route("/analyze", methods=["POST"])
def analyze_url():

    data = request.get_json() or {}

    url = data.get("url", "").strip()

    findings = []
    recommendations = []

    score = 100

    parsed = urlparse(url)

    domain = parsed.netloc.lower()

    # ======================================
    # HTTPS
    # ======================================

    https_enabled = url.startswith("https://")

    if https_enabled:
        findings.append("HTTPS habilitado")
    else:
        findings.append("HTTPS não habilitado")
        recommendations.append(
            "Utilizar HTTPS para proteger a comunicação."
        )
        score -= 25

    # ======================================
    # PALAVRAS SUSPEITAS
    # ======================================

    suspicious_words = [
        "login",
        "verify",
        "account",
        "secure",
        "update",
        "bank",
        "pix",
        "senha",
        "premio",
        "bonus",
        "gift"
    ]

    suspicious_found = []

    for word in suspicious_words:

        if word in url.lower():
            suspicious_found.append(word)

    if suspicious_found:

        findings.append(
            f"Palavras suspeitas encontradas: {', '.join(suspicious_found)}"
        )

        recommendations.append(
            "Validar a legitimidade do domínio."
        )

        score -= 20

    # ======================================
    # MUITOS HÍFENS
    # ======================================

    hyphen_count = domain.count("-")

    if hyphen_count >= 3:

        findings.append(
            "Muitos hífens encontrados no domínio."
        )

        score -= 10

    # ======================================
    # URL LONGA
    # ======================================

    if len(url) > 100:

        findings.append(
            "URL excessivamente longa."
        )

        score -= 10

    # ======================================
    # TLD SUSPEITO
    # ======================================

    suspicious_tlds = [
        ".xyz",
        ".top",
        ".click",
        ".work",
        ".zip",
        ".gq",
        ".tk"
    ]

    if any(domain.endswith(tld)
           for tld in suspicious_tlds):

        findings.append(
            "Domínio com extensão suspeita."
        )

        score -= 20

    # ======================================
    # ENCURTADORES
    # ======================================

    shorteners = [
        "bit.ly",
        "tinyurl.com",
        "cutt.ly",
        "goo.gl",
        "shorturl.at"
    ]

    if any(short in domain
           for short in shorteners):

        findings.append(
            "URL encurtada detectada."
        )

        recommendations.append(
            "Expandir o link antes de acessá-lo."
        )

        score -= 15

    # ======================================
    # IP AO INVÉS DE DOMÍNIO
    # ======================================

    ip_pattern = (
        r"^(?:[0-9]{1,3}\.){3}"
        r"[0-9]{1,3}$"
    )

    if re.match(ip_pattern, domain):

        findings.append(
            "Endereço IP utilizado no lugar de domínio."
        )

        recommendations.append(
            "Evitar acessar links baseados em IP."
        )

        score -= 30

    # ======================================
    # CLASSIFICAÇÃO FINAL
    # ======================================

    score = max(score, 0)

    if score >= 80:
        risk = "BAIXO"

    elif score >= 50:
        risk = "MÉDIO"

    else:
        risk = "ALTO"

    # ======================================
    # RESPOSTA
    # ======================================

    return jsonify({

        "url": url,

        "domain": domain,

        "https": https_enabled,

        "risk": risk,

        "score": score,

        "findings": findings,

        "recommendations": recommendations

    })