import socket

from urllib.parse import urlparse


def analyze_dns(url):

    result = {

        "dns_resolves": False,

        "ip_address": None,

        "score": 100,

        "issues": []

    }

    try:

        hostname = urlparse(
            url
        ).hostname

        ip = socket.gethostbyname(
            hostname
        )

        result["dns_resolves"] = True

        result["ip_address"] = ip

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result