from flask import Blueprint, request, jsonify
from urllib.parse import urlparse

urls_bp = Blueprint("urls", __name__)

@urls_bp.route("/analyze", methods=["POST"])
def analyze_url():

    data = request.json
    url = data.get("url", "")

    result = {
        "url": url,
        "https": False,
        "risk": "BAIXO"
    }

    if url.startswith("https://"):
        result["https"] = True

    suspicious_words = [
        "login",
        "verify",
        "account",
        "secure",
        "update",
        "bank"
    ]

    for word in suspicious_words:
        if word in url.lower():
            result["risk"] = "ALTO"

    return jsonify(result)

from flask import Blueprint, request, jsonify

urls_bp = Blueprint("urls", __name__)

@urls_bp.route("/analyze", methods=["POST"])
def analyze_url():

    data = request.json
    url = data.get("url", "")

    suspicious = [
        "login",
        "verify",
        "account",
        "bank",
        "secure"
    ]

    risk = "BAIXO"

    for word in suspicious:
        if word in url.lower():
            risk = "ALTO"

    return jsonify({
        "url": url,
        "risk": risk,
        "https": url.startswith("https://")
    })
