import requests


def analyze_server(url):

    result = {

        "server": "Desconhecido",
        "score": 100,
        "issues": []

    }

    try:

        response = requests.get(
            url,
            timeout=10
        )

        result["server"] = (
            response.headers.get(
                "Server",
                "Não informado"
            )
        )

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result