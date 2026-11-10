from flask import Blueprint, request, jsonify

passwords_bp = Blueprint("passwords", __name__)


@passwords_bp.route("/", methods=["GET"])
def passwords():

    return jsonify({
        "module": "Password Checker",
        "status": "ready"
    })


@passwords_bp.route("/check", methods=["POST"])
def check_password():

    data = request.get_json() or {}

    password = data.get("password", "")

    return jsonify({
        "password_length": len(password),
        "status": "ok"
    })