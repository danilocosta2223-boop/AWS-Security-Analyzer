class AuditResult:

    def __init__(
        self,
        url,
        score,
        grade,
        results
    ):

        self.url = url

        self.score = score

        self.grade = grade

        self.results = results

    def to_dict(self):

        return {

            "url": self.url,

            "score": self.score,

            "grade": self.grade,

            "results": self.results
        }

    def __str__(self):

        return (
            f"AuditResult("
            f"url={self.url}, "
            f"score={self.score}, "
            f"grade={self.grade})"
        )