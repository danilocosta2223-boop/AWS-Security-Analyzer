from datetime import datetime


def generate_report(data):

    report = {

        "success": True,

        "generated_at":
        datetime.now().strftime(
            "%d/%m/%Y %H:%M:%S"
        ),

        "source":
        "CyberCheck PRO",

        "report": data

    }

    return report