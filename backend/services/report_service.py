from backend.reports.csv_generator import generate_csv
from backend.reports.html_generator import generate_html
from backend.reports.pdf_generator import generate_pdf

from backend.database.database import save_report


def generate_report(
    data,
    report_format
):

    if report_format == "csv":

        result = generate_csv(data)

    elif report_format == "html":

        result = generate_html(data)

    elif report_format == "pdf":

        result = generate_pdf(data)

    else:

        return {
            "success": False,
            "error": "Formato inválido"
        }

    save_report(
        result["file"],
        report_format,
        result["file"]
    )

    return result