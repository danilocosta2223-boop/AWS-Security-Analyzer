from flask import Blueprint
from flask import request
from flask import jsonify

breach_bp = Blueprint(
    "breach",
    __name__
)

@breach_bp.route(
    "/check",
    methods=["POST"]
)
def check_breach():

    email = request.json.get(
        "email",
        ""
    )

    suspicious = [
        "admin",
        "root",
        "teste",
        "suporte",
        "financeiro"
    ]

    exposed = any(
        word in email.lower()
        for word in suspicious
    )

    return jsonify({
        "email": email,
        "exposed": exposed,
        "risk": 85 if exposed else 0
    })