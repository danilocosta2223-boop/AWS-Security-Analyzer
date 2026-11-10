from backend.services.score_engine import (
    calculate_score
)


class AuditService:

    @staticmethod
    def build_audit_result(
        url,
        results
    ):

        final_score = calculate_score(
            results
        )

        return {

            "url": url,

            "score": final_score.get(
                "score",
                0
            ),

            "grade": final_score.get(
                "grade",
                "F"
            ),

            "results": results
        }

    @staticmethod
    def build_error_result(
        url,
        error
    ):

        return {

            "url": url,

            "score": 0,

            "grade": "F",

            "error": str(error)
        }

    