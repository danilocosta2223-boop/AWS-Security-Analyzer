from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)

@health_bp.route("/")
def health():
    return jsonify({
        "service": "Cyber Shield Brasil API",
        "status": "online",
        "version": "1.0.0"
    })