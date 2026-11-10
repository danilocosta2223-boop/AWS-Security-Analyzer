from pathlib import Path
from datetime import datetime


def generate_pdf(data):

    reports_dir = Path("storage/reports")

    reports_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = (
        f"report_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    )

    file_path = reports_dir / filename

    with open(
        file_path,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(
            "CYBERCHECK PRO REPORT\n\n"
        )

        file.write(
            str(data)
        )

    return {

        "success": True,

        "file": str(file_path),

        "format": "pdf"
    }