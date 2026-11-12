from pathlib import Path
from datetime import datetime

from reportlab.pdfgen import canvas


def generate_pdf(data):

    reports_dir = Path(
        "storage/reports"
    )

    reports_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = (
        f"report_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    )

    file_path = reports_dir / filename

    pdf = canvas.Canvas(
        str(file_path)
    )

    pdf.setTitle(
        "CyberCheck PRO Report"
    )

    y = 800

    pdf.drawString(
        50,
        y,
        "CYBERCHECK PRO REPORT"
    )

    y -= 40

    for key, value in data.items():

        pdf.drawString(
            50,
            y,
            f"{key}: {value}"
        )

        y -= 20

    pdf.save()

    return {

        "success": True,

        "file": str(file_path),

        "format": "pdf"
    }