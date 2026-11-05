import requests


def analyze_robots(url):

    result = {
        "exists": False,
        "sensitive_paths": [],
        "score": 100,
        "issues": []
    }

    try:

        robots_url = (
            url.rstrip("/") +
            "/robots.txt"
        )

        response = requests.get(
            robots_url,
            timeout=10
        )

        if response.status_code == 200:

            result["exists"] = True

            content = response.text.lower()

            sensitive_keywords = [
                "/admin",
                "/backup",
                "/private",
                "/internal",
                "/config",
                "/dev"
            ]

            for keyword in sensitive_keywords:

                if keyword in content:

                    result["sensitive_paths"].append(
                        keyword
                    )

                    result["score"] -= 10

            if len(
                result["sensitive_paths"]
            ) > 0:

                result["issues"].append(
                    "Possíveis diretórios sensíveis encontrados"
                )

        else:

            result["issues"].append(
                "robots.txt não encontrado"
            )

            result["score"] -= 20

    except Exception as error:

        result["issues"].append(
            str(error)
        )

        result["score"] = 0

    return result