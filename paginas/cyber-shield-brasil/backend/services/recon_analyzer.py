import socket

from urllib.parse import urlparse


def analyze_recon(url):

    result = {

        "hostname": None,

        "ip_address": None,

        "reverse_dns": None,

        "dns_resolves": False,

        "score": 100,

        "issues": []

    }

    try:

        hostname = urlparse(
            url
        ).hostname

        result["hostname"] = hostname

        ip_address = socket.gethostbyname(
            hostname
        )

        result["ip_address"] = ip_address

        result["dns_resolves"] = True

        try:

            reverse_dns = socket.gethostbyaddr(
                ip_address
            )[0]

            result[
                "reverse_dns"
            ] = reverse_dns

        except Exception:

            result["issues"].append(
                "Reverse DNS não encontrado"
            )

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result