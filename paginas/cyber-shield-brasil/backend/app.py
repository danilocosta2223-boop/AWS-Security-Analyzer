from flask import Flask
from flask_cors import CORS

from config import Config

from routes.health import health_bp
from routes.urls import urls_bp
from routes.passwords import passwords_bp
from routes.phishing import phishing_bp
from routes.breach import breach_bp

app = Flask(__name__)

app.config.from_object(Config)

CORS(app)

# ==================================================
# REGISTRO DAS ROTAS
# ==================================================

app.register_blueprint(
    health_bp,
    url_prefix="/api/health"
)

app.register_blueprint(
    urls_bp,
    url_prefix="/api/url"
)

app.register_blueprint(
    passwords_bp,
    url_prefix="/api/password"
)

app.register_blueprint(
    phishing_bp,
    url_prefix="/api/phishing"
)

app.register_blueprint(
    breach_bp,
    url_prefix="/api/breach"
)

# ==================================================
# HOME
# ==================================================

@app.route("/")
def home():

    return {
        "project": Config.APP_NAME,
        "version": Config.VERSION,
        "status": "online"
    }


# ==================================================
# ABOUT API
# ==================================================

@app.route("/api")
def api():

    return {
        "name": "CyberCheck API",
        "version": Config.VERSION,
        "modules": [
            "health",
            "url",
            "password",
            "phishing",
            "breach"
        ]
    }


# ==================================================
# EXECUÇÃO
# ==================================================

if __name__ == "__main__":

    print("=" * 50)
    print("CyberCheck API")
    print("Servidor iniciado")
    print("URL: http://127.0.0.1:5000")
    print("=" * 50)

    app.run(
        debug=Config.DEBUG
    )