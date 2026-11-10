import requests


def detect_technology(url):

    result = {

        "technologies": [],
        "score": 100,
        "issues": []

    }

    try:

        response = requests.get(
            url,
            timeout=10
        )

        html = response.text.lower()

        technologies = {

            "react": "React",
            "angular": "Angular",
            "vue": "Vue",
            "wordpress": "WordPress",
            "django": "Django",
            "laravel": "Laravel",
            "flask": "Flask",
            "php": "PHP",
            "node": "Node.js"

        }

        for token, name in technologies.items():

            if token in html:

                result[
                    "technologies"
                ].append(name)

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result