import requests


def analyze_owasp(url):

    result = {

        "sql_injection": False,

        "xss": False,

        "csrf": False,

        "open_redirect": False,

        "clickjacking": False,

        "score": 100,

        "issues": []

    }

    try:

        response = requests.get(
            url,
            timeout=10
        )

        headers = response.headers

        if (
            "X-Frame-Options"
            not in headers
        ):

            result["clickjacking"] = True

            result["score"] -= 20

            result["issues"].append(
                "Proteção contra Clickjacking ausente"
            )

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result