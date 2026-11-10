from flask import Blueprint, request, jsonify

# Blueprint do módulo Phishing
phishing_bp = Blueprint("phishing", __name__)


# ==================================================
# ROTA PRINCIPAL DO MÓDULO
# URL: /api/phishing
# ==================================================
@phishing_bp.route("/", methods=["GET"])
def phishing():

    return jsonify({
        "modulo": "Detector de Phishing",
        "status": "pronto"
    })


# ==================================================
# DETECÇÃO DE PHISHING
# URL: /api/phishing/detect
# ==================================================
@phishing_bp.route("/detect", methods=["POST"])
def detect_phishing():

    data = request.get_json() or {}

    text = data.get("text", "")

    suspicious_words = [
        "urgente",
        "pix",
        "senha",
        "clique aqui",
        "premio",
        "conta bloqueada",
        "atualize agora"
    ]

    found = []

    for word in suspicious_words:

        if word.lower() in text.lower():
            found.append(word)

    return jsonify({
        "suspeitas": found,
        "risk": "ALTO" if found else "BAIXO"
    })