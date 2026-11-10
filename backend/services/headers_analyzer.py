import requests


def analyze_headers(url):

    result = {
        "Content-Security-Policy": False,
        "X-Frame-Options": False,
        "X-Content-Type-Options": False,
        "Strict-Transport-Security": False,
        "Referrer-Policy": False,
        "Permissions-Policy": False,
        "Server": "Desconhecido",
        "score": 0,
        "issues": []
    }

    try:

        response = requests.get(
            url,
            timeout=10,
            allow_redirects=True
        )

        headers = response.headers

        security_headers = [
            "Content-Security-Policy",
            "X-Frame-Options",
            "X-Content-Type-Options",
            "Strict-Transport-Security",
            "Referrer-Policy",
            "Permissions-Policy"
        ]

        found = 0

        for header in security_headers:

            if header in headers:

                result[header] = True

                found += 1

            else:

                result["issues"].append(
                    f"Header ausente: {header}"
                )

        result["Server"] = headers.get(
            "Server",
            "Não informado"
        )

        result["score"] = round(
            (found / len(security_headers)) * 100
        )

    except Exception as error:

        result["issues"].append(
            str(error)
        )

    return result