import csv

from pathlib import Path
from datetime import datetime


def generate_csv(data):

    reports_dir = Path(
        "storage/reports"
    )

    reports_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = (
        f"report_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )

    file_path = reports_dir / filename

    with open(
        file_path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.writer(
            file
        )

        writer.writerow([
            "Campo",
            "Valor"
        ])

        for key, value in data.items():

            writer.writerow([
                key,
                value
            ])

    return {

        "success": True,

        "file": str(file_path),

        "format": "csv"
    }
