from flask import Flask
from flask_cors import CORS

from routes.health import health_bp

app = Flask(__name__)

CORS(app)

app.register_blueprint(
    health_bp,
    url_prefix="/api/health"
)

@app.route("/")
def home():
    return {
        "project": "Cyber Shield Brasil",
        "version": "1.0.0",
        "status": "online"
    }

if __name__ == "__main__":
    app.run(debug=True)