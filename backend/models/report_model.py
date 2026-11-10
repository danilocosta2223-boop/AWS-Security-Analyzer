class ReportModel:

    def __init__(
        self,
        report_name,
        report_type,
        report_path,
        created_at=None
    ):

        self.report_name = report_name

        self.report_type = report_type

        self.report_path = report_path

        self.created_at = created_at

    def to_dict(self):

        return {

            "report_name": self.report_name,

            "report_type": self.report_type,

            "report_path": self.report_path,

            "created_at": self.created_at
        }

    def __str__(self):

        return (
            f"ReportModel("
            f"name={self.report_name}, "
            f"type={self.report_type})"
        )