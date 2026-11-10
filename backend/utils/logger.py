import logging
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

LOGS_DIR = BASE_DIR / "logs"

LOGS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

LOG_FILE = LOGS_DIR / "app.log"


logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(message)s"
    ),
    handlers=[
        logging.FileHandler(
            LOG_FILE,
            encoding="utf-8"
        ),
        logging.StreamHandler()
    ]
)


logger = logging.getLogger(
    "CyberCheckPRO"
)


def log_info(message):

    logger.info(message)


def log_warning(message):

    logger.warning(message)


def log_error(message):

    logger.error(message)


def log_exception(message):

    logger.exception(message)