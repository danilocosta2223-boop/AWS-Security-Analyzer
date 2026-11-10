from datetime import datetime


class ReportService:

    @staticmethod
    def generate(data):

        return {

            "success": True,

            "generated_at": datetime.now().isoformat(),

            "report": data
        }

    @staticmethod
    def summary(data):

        return {

            "total_items": len(data),

            "generated_at": datetime.now().isoformat()
        }