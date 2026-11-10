from backend.database.database import (
    save_scan,
    get_scans
)


class HistoryService:

    @staticmethod
    def save(
        target,
        scan_type,
        score,
        result
    ):

        save_scan(
            target,
            scan_type,
            score,
            result
        )

    @staticmethod
    def get_all():

        return get_scans()