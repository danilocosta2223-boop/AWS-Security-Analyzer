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

            result["issues"].append(
                "Hostname inválido"
            )

            result["score"] = 0

            return result

        if parsed.scheme == "https":

            result["https"] = True

        else:

            result["issues"].append(
                "HTTPS não está habilitado"
            )

            result["score"] -= 30

        context = ssl.create_default_context()

        with socket.create_connection(
            (hostname, 443),
            timeout=10
        ) as sock:

            with context.wrap_socket(
                sock,
                server_hostname=hostname
            ) as secure_sock:

                cert = secure_sock.getpeercert()

                issuer = cert.get(
                    "issuer",
                    []
                )

                if issuer:

                    try:

                        result["issuer"] = (
                            issuer[-1][0][1]
                        )

                    except Exception:

                        pass

                expire_date = datetime.strptime(
                    cert["notAfter"],
                    "%b %d %H:%M:%S %Y %Z"
                )

                days_left = (
                    expire_date -
                    datetime.utcnow()
                ).days

                result[
                    "certificate_valid"
                ] = True

                result[
                    "days_remaining"
                ] = days_left

                # ====================
                # Classificação
                # ====================

                if days_left > 365:

                    result["grade"] = "A+"

                elif days_left > 180:

                    result["grade"] = "A"

                elif days_left > 90:

                    result["grade"] = "A-"

                elif days_left > 60:

                    result["grade"] = "B"

                elif days_left > 30:

                    result["grade"] = "C"

                    result["score"] -= 10

                    result["issues"].append(
                        "Certificado com menos de 30 dias para expirar"
                    )

                else:

                    result["grade"] = "D"

                    result["score"] -= 25

                    result["issues"].append(
                        "Certificado próximo da expiração"
                    )

    except ssl.SSLError:

        result["score"] = 0

        result["issues"].append(
            "Erro SSL detectado"
        )

    except socket.timeout:

        result["score"] = 0

        result["issues"].append(
            "Timeout ao conectar ao servidor"
        )

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    # garantir limites

    if result["score"] < 0:

        result["score"] = 0

    return result