import re


def check_leak(email):

    result = {

        "success": True,

        "email": email,

        "valid_email": False,

        "risk": "unknown",

        "breaches_found": 0,

        "status": "Não Verificado"

    }

    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

    if not re.match(
        email_regex,
        email
    ):

        return {

            "success": False,

            "message": "E-mail inválido"

        }

    result["valid_email"] = True

    public_domains = [

        "gmail.com",
        "hotmail.com",
        "outlook.com",
        "yahoo.com"

    ]

    domain = email.split("@")[1]

    if domain in public_domains:

        result["risk"] = "Médio"

    else:

        result["risk"] = "Baixo"

    result["status"] = "Simulação Local"

    return result
