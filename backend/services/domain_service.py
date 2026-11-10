import whois


def analyze_domain(domain):

    try:

        result = whois.whois(domain)

        return {

            "success": True,

            "domain": domain,

            "registrar": str(
                result.registrar
            ),

            "creation_date": str(
                result.creation_date
            ),

            "expiration_date": str(
                result.expiration_date
            ),

            "score": 80
        }

    except Exception as error:

        return {

            "success": False,

            "domain": domain,

            "registrar": "Desconhecido",

            "creation_date": None,

            "expiration_date": None,

            "error": str(error),

            "score": 0
        }