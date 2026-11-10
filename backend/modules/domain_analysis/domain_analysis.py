import socket
from urllib.parse import urlparse


def analyze_domain(domain):

    result = {

        "success": True,

        "domain": domain,

        "ip": None,

        "hostname": None,

        "status": "online"

    }

    try:

        domain = domain.replace(
            "https://",
            ""
        )

        domain = domain.replace(
            "http://",
            ""
        )

        domain = domain.split("/")[0]

        ip = socket.gethostbyname(
            domain
        )

        result["ip"] = ip

        result["hostname"] = domain

        return result

    except Exception as error:

        return {

            "success": False,

            "message": str(error)

        }