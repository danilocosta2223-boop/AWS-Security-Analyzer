import requests


def analyze_cookies(url):

    result = {

        "cookies_found": 0,
        "secure": False,
        "httponly": False,
        "score": 100,
        "issues": []

    }

    try:

        response = requests.get(
            url,
            timeout=10
        )

        cookies = response.cookies

        result["cookies_found"] = len(
            cookies
        )

        for cookie in cookies:

            if cookie.secure:

                result["secure"] = True

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result