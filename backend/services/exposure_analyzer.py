import requests


def analyze_exposure(url):

    result = {
        "exposed_files": [],
        "score": 100,
        "issues": []
    }

    targets = [

        "/.env",

        "/.git/config",

        "/backup.zip",

        "/database.sql",

        "/config.php",

        "/admin",

        "/phpinfo.php"

    ]

    for target in targets:

        try:

            full_url = (
                url.rstrip("/") +
                target
            )

            response = requests.get(
                full_url,
                timeout=5
            )

            if response.status_code == 200:

                result["exposed_files"].append(
                    target
                )

                result["score"] -= 15

        except Exception:

            continue

    if result["exposed_files"]:

        result["issues"].append(
            "Arquivos ou diretórios potencialmente expostos"
        )

    return result