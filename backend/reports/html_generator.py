from pathlib import Path
from datetime import datetime


def generate_html(data):

    reports_dir = Path(
        "storage/reports"
    )

    reports_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = (
        f"report_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    )

    file_path = reports_dir / filename

    html = f"""
    <html>

    <head>
        <title>CyberCheck PRO</title>
    </head>

    <body>

        <h1>CyberCheck PRO Report</h1>

        <pre>{data}</pre>

    </body>

    </html>
    """

    with open(
        file_path,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(html)

    return {

        "success": True,

        "file": str(file_path),

        "format": "html"
    }