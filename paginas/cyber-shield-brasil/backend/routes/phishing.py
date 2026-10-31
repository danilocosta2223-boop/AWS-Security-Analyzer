from flask import Blueprint, request, jsonify

phishing_bp = Blueprint("phishing", __name__)

@phishing_bp.route("/detect", methods=["POST"])
def detect_phishing():

    text = request.json.get("text", "")

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