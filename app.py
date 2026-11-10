from backend.app import create_app
from backend.config import Config

app = create_app()

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("CYBER SHIELD BRASIL")
    print("=" * 60)
    print()

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )