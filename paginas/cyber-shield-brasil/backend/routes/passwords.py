from flask import Blueprint, request, jsonify
import re

passwords_bp = Blueprint("passwords", __name__)

@passwords_bp.route("/check", methods=["POST"])
def check_password():

    password = request.json.get("password", "")
    score = 0

    if len(password) >= 12:
        score += 25

    if re.search(r"[A-Z]", password):
        score += 25

    if re.search(r"[0-9]", password):
        score += 25

    if re.search(r"[!@#$%^&*()_+=]", password):
        score += 25

    if score < 50:
        level = "FRACA"
    elif score < 75:
        level = "MEDIA"
    else:
        level = "FORTE"

    return jsonify({
        "score": score,
        "level": level
    })