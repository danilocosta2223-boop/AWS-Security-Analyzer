from urllib.parse import urlparse


def analyze_url(url):

    try:

        parsed = urlparse(url)

        https_enabled = (
            parsed.scheme == "https"
        )

        score = 100 if https_enabled else 50

        return {

            "success": True,

            "url": url,

            "domain": parsed.netloc,

            "scheme": parsed.scheme,

            "https": https_enabled,

            "score": score
        }

    except Exception as error:

        return {

            "success": False,

            "error": str(error),

            "score": 0
        }