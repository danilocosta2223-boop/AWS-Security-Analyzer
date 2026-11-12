from flask import Flask
from flask_cors import CORS

from backend.config import Config

from backend.routes.audit import audit_bp
from backend.routes.history import history_bp
from backend.routes.reports import reports_bp


def create_app():

    app = Flask(__name__)

    app.config.from_object(
        Config
    )

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

                "audit",

                "history",

                "reports"
            ]
        }

    return app

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

    return app
