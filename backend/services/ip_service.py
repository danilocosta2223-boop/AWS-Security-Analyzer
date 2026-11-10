import socket


def analyze_ip(ip):

    try:

        hostname = socket.gethostbyaddr(
            ip
        )[0]

        return {

            "success": True,

            "ip": ip,

            "hostname": hostname,

            "score": 80
        }

    except Exception as error:

        return {

            "success": False,

            "error": str(error),

            "score": 0
        }