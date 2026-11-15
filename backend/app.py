from flask import Flask
from flask_cors import CORS

from backend.config import Config

from backend.routes.audit import audit_bp
from backend.routes.history import history_bp
from backend.routes.reports import reports_bp
from backend.routes.dashboard import dashboard_bp


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

    app.register_blueprint(
        history_bp,
        url_prefix="/api/history"
    )

    app.register_blueprint(
        reports_bp,
        url_prefix="/api/reports"
    )

    app.register_blueprint(
        dashboard_bp,
        url_prefix="/api/dashboard"
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
            "status": "online",
            "modules": [
                "audit",
                "history",
                "reports",
                "dashboard"
            ]
        }

    # ==========================
    # HEALTH CHECK
    # ==========================

    @app.route("/health")
    def health():
        return {
            "status": "healthy"
        }

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )