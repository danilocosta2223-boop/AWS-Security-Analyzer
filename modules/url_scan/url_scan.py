import re
import socket
from urllib.parse import urlparse


def scan_url(url):

    result = {

        "url": url,

        "valid": False,

        "domain": None,

        "https": False,

        "ip": None,

        "risk": "unknown",

        "score": 0

    }

    try:

        parsed = urlparse(url)

        if parsed.scheme not in ["http", "https"]:
            return result

        domain = parsed.netloc

        ip = socket.gethostbyname(domain)

        result["valid"] = True

        result["domain"] = domain

        result["ip"] = ip

        result["https"] = parsed.scheme == "https"

        score = 100

        if parsed.scheme != "https":
            score -= 30

        suspicious_words = [

            "login",
            "verify",
            "secure",
            "update",
            "bank",
            "paypal"

        ]

        for word in suspicious_words:

            if word in url.lower():

                score -= 10

        score = max(score, 0)

        result["score"] = score

        if score >= 80:

            result["risk"] = "low"

        elif score >= 50:

            result["risk"] = "medium"

        else:

            result["risk"] = "high"

        return result

    except Exception as e:

        result["error"] = str(e)

        return result