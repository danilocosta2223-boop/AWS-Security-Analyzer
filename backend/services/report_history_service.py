from backend.database.database import (
    save_report,
    get_reports
)


class ReportHistoryService:

    @staticmethod
    def save(
        report_name,
        report_type,
        report_path
    ):

        save_report(
            report_name,
            report_type,
            report_path
        )

    @staticmethod
    def get_all():

        return get_reports()