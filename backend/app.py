from flask import Flask
from flask_cors import CORS

from backend.config import Config
from backend.routes.audit import audit_bp


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    CORS(app)

    # ==========================
    # BLUEPRINTS
    # ==========================

    app.register_blueprint(
        audit_bp,
        url_prefix="/api/audit"
    )

    # ==========================
    # HOME
    # ==========================

    @app.route("/")
    def home():

        return {
            "project": "Cyber Shield Brasil",
            "version": getattr(
                Config,
                "VERSION",
                "1.0.0"
            ),
            "status": "online"
        }

    # ==========================
    # API INFO
    # ==========================

    @app.route("/api")
    def api():

        return {
            "project": "Cyber Shield Brasil",
            "version": getattr(
                Config,
                "VERSION",
                "1.0.0"
            ),
            "modules": [
                "audit"
            ]
        }

    return app