from flask import Blueprint, request, jsonify

phishing_bp = Blueprint("phishing", __name__)

@phishing_bp.route("/detect", methods=["POST"])
def detect():

    text = request.json.get("text", "")

    palavras = [
        "urgente",
        "pix",
        "senha",
        "premio",
        "clique aqui",
        "conta bloqueada"
    ]

    encontradas = []

    for palavra in palavras:
        if palavra.lower() in text.lower():
            encontradas.append(palavra)

    return jsonify({
        "risco": "ALTO" if encontradas else "BAIXO",
        "palavras": encontradas
    })