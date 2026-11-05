import requests
import xml.etree.ElementTree as ET


def analyze_sitemap(url):

    result = {
        "exists": False,
        "urls_found": 0,
        "score": 100,
        "issues": []
    }

    try:

        sitemap_url = (
            url.rstrip("/") +
            "/sitemap.xml"
        )

        response = requests.get(
            sitemap_url,
            timeout=10
        )

        if response.status_code != 200:

            result["score"] -= 20

            result["issues"].append(
                "Sitemap não encontrado"
            )

            return result

        result["exists"] = True

        try:

            root = ET.fromstring(
                response.text
            )

            urls = root.findall(
                ".//{*}loc"
            )

            result["urls_found"] = len(
                urls
            )

        except Exception:

            result["issues"].append(
                "Sitemap encontrado mas não está em formato XML válido"
            )

            result["score"] -= 10

    except Exception as error:

        result["score"] = 0

        result["issues"].append(
            str(error)
        )

    return result