import socket

from urllib.parse import urlparse


def analyze_ports(url):

    result = {

        "open_ports": [],

        "score": 100,

        "issues": []

    }

    common_ports = [

        21,
        22,
        25,
        80,
        443,
        3306,
        5432,
        8080

    ]

    try:

        hostname = (
            urlparse(url)
            .hostname
        )

        for port in common_ports:

            sock = socket.socket()

            sock.settimeout(1)

            connection = sock.connect_ex(
                (hostname, port)
            )

            if connection == 0:

                result[
                    "open_ports"
                ].append(port)

            sock.close()

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result