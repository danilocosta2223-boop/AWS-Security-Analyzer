def analyze_reputation(url):

    result = {

        "risk": "UNKNOWN",

        "score": 100,

        "issues": []

    }

    suspicious = [

        ".xyz",

        ".click",

        ".top",

        ".gq",

        ".tk"

    ]

    for item in suspicious:

        if item in url.lower():

            result["risk"] = "HIGH"

            result["score"] -= 40

            result["issues"].append(
                f"Domínio suspeito: {item}"
            )

    if result["risk"] == "UNKNOWN":

        result["risk"] = "LOW"

    return result