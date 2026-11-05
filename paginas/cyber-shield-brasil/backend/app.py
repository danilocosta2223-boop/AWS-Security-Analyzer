from flask import Flask
from flask_cors import CORS

from config import Config

from routes.audit import audit_bp


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


# ==========================
# HOME
# ==========================

@app.route("/")
def home():

    return {

        "project": "Cyber Shield Brasil",

        "version": Config.VERSION,

        "status": "online"

    }


# ==========================
# API INFO
# ==========================

@app.route("/api")
def api():

    return {

        "project": "Cyber Shield Brasil",

        "version": Config.VERSION,

        "modules": [

            "audit"

        ]

    }


# ==========================
# START
# ==========================

if __name__ == "__main__":

    print()

    print(
        "=" * 50
    )

    print(
        "Cyber Shield Brasil"
    )

    print(
        "Backend iniciado"
    )

    print()

    print(
        "Rotas disponíveis:"
    )

    for rule in app.url_map.iter_rules():

        print(rule)

    print(
        "=" * 50
    )

    print()

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=Config.DEBUG

    )