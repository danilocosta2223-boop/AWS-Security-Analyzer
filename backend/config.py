import os
from pathlib import Path
from dotenv import load_dotenv

# =====================================================
# CAMINHO BASE DO PROJETO
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# =====================================================
# CARREGA VARIÁVEIS DE AMBIENTE
# =====================================================

load_dotenv(BASE_DIR / ".env")

# =====================================================
# CONFIGURAÇÕES CENTRAIS
# =====================================================

class Config:

    # -------------------------------------------------
    # INFORMAÇÕES DO PROJETO
    # -------------------------------------------------

    PROJECT_NAME = "Cyber Shield Brasil"

    VERSION = "1.0.0"

    # -------------------------------------------------
    # FLASK
    # -------------------------------------------------

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "cybercheck-pro-secret-key"
    )

    DEBUG = os.getenv(
        "DEBUG",
        "True"
    ).lower() == "true"

    HOST = os.getenv(
        "HOST",
        "127.0.0.1"
    )

    PORT = int(
        os.getenv(
            "PORT",
            "5000"
        )
    )

    # -------------------------------------------------
    # VIRUSTOTAL
    # -------------------------------------------------

    VT_API_KEY = os.getenv(
        "VT_API_KEY",
        ""
    )

    # -------------------------------------------------
    # SHODAN
    # -------------------------------------------------

    SHODAN_API_KEY = os.getenv(
        "SHODAN_API_KEY",
        ""
    )

    # -------------------------------------------------
    # ABUSEIPDB
    # -------------------------------------------------

    ABUSEIPDB_API_KEY = os.getenv(
        "ABUSEIPDB_API_KEY",
        ""
    )

    # -------------------------------------------------
    # GOOGLE SAFE BROWSING
    # -------------------------------------------------

    GOOGLE_SAFE_BROWSING_API_KEY = os.getenv(
        "GOOGLE_SAFE_BROWSING_API_KEY",
        ""
    )

    # -------------------------------------------------
    # PHISHTANK
    # -------------------------------------------------

    PHISHTANK_API_KEY = os.getenv(
        "PHISHTANK_API_KEY",
        ""
    )

    # -------------------------------------------------
    # BANCO SQLITE
    # -------------------------------------------------

    DATABASE_PATH = (
        BASE_DIR
        / "backend"
        / "database"
        / "security.db"
    )

    # -------------------------------------------------
    # LOGS
    # -------------------------------------------------

    LOGS_DIR = (
        BASE_DIR
        / "backend"
        / "logs"
    )

    APP_LOG = (
        LOGS_DIR
        / "app.log"
    )

    ERROR_LOG = (
        LOGS_DIR
        / "error.log"
    )

    AUDIT_LOG = (
        LOGS_DIR
        / "audit.log"
    )

    # -------------------------------------------------
    # STORAGE
    # -------------------------------------------------

    STORAGE_DIR = (
        BASE_DIR
        / "storage"
    )

    REPORTS_DIR = (
        STORAGE_DIR
        / "reports"
    )

    EXPORTS_DIR = (
        STORAGE_DIR
        / "exports"
    )

    UPLOADS_DIR = (
        STORAGE_DIR
        / "uploads"
    )

    CACHE_DIR = (
        STORAGE_DIR
        / "cache"
    )