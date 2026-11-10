import ssl
import socket

from urllib.parse import urlparse
from datetime import datetime


def analyze_ssl(url):

    result = {

        "https": False,
        "certificate_valid": False,
        "days_remaining": 0,
        "grade": "F",
        "score": 100,
        "issuer": "Desconhecido",
        "issues": []

    }

    try:

        parsed = urlparse(url)

        hostname = parsed.hostname

        if not hostname:

            result["score"] = 0

            result["issues"].append(
                "Hostname inválido"
            )

            return result

        if parsed.scheme == "https":

            result["https"] = True

        else:

            result["score"] -= 30

            result["issues"].append(
                "HTTPS não habilitado"
            )

        context = ssl.create_default_context()

        with socket.create_connection(
            (hostname, 443),
            timeout=5
        ) as sock:

            with context.wrap_socket(
                sock,
                server_hostname=hostname
            ) as secure_sock:

                cert = secure_sock.getpeercert()

                expire_date = datetime.strptime(
                    cert["notAfter"],
                    "%b %d %H:%M:%S %Y %Z"
                )

                days_left = (
                    expire_date -
                    datetime.utcnow()
                ).days

                result["certificate_valid"] = True

                result["days_remaining"] = days_left

                if days_left > 365:

                    result["grade"] = "A+"

                elif days_left > 180:

                    result["grade"] = "A"

                elif days_left > 90:

                    result["grade"] = "B"

                elif days_left > 30:

                    result["grade"] = "C"

                    result["score"] -= 10

                else:

                    result["grade"] = "D"

                    result["score"] -= 25

                    result["issues"].append(
                        "Certificado próximo da expiração"
                    )

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result