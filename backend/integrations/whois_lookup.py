import socket
import whois

from urllib.parse import urlparse
from datetime import datetime


def analyze_whois(url):

    result = {

        "domain": "",

        "registrar": "Desconhecido",

        "creation_date": None,

        "expiration_date": None,

        "days_until_expiration": None,

        "domain_age_days": None,

        "score": 100,

        "issues": []

    }

    try:

        socket.setdefaulttimeout(
            15
        )

        hostname = urlparse(
            url
        ).hostname

        if not hostname:

            result["score"] = 0

            result["issues"].append(
                "Hostname inválido"
            )

            return result

        result["domain"] = hostname

        domain_data = whois.whois(
            hostname
        )

        result["registrar"] = (

            getattr(
                domain_data,
                "registrar",
                None
            )

            or

            "Desconhecido"
        )

        creation_date = getattr(

            domain_data,

            "creation_date",

            None

        )

        expiration_date = getattr(

            domain_data,

            "expiration_date",

            None

        )

        if isinstance(
            creation_date,
            list
        ):
            creation_date = (
                creation_date[0]
            )

        if isinstance(
            expiration_date,
            list
        ):
            expiration_date = (
                expiration_date[0]
            )

        if creation_date:

            result[
                "creation_date"
            ] = creation_date.strftime(
                "%Y-%m-%d"
            )

            domain_age = (

                datetime.now() -

                creation_date

            ).days

            result[
                "domain_age_days"
            ] = domain_age

            if domain_age < 180:

                result["score"] -= 20

                result[
                    "issues"
                ].append(

                    "Domínio muito recente"

                )

        if expiration_date:

            result[
                "expiration_date"
            ] = expiration_date.strftime(
                "%Y-%m-%d"
            )

            days_left = (

                expiration_date -

                datetime.now()

            ).days

            result[
                "days_until_expiration"
            ] = days_left

            if days_left < 90:

                result["score"] -= 25

                result[
                    "issues"
                ].append(

                    "Domínio próximo da expiração"

                )

        if not creation_date:

            result["score"] -= 10

            result[
                "issues"
            ].append(

                "Data de criação não localizada"

            )

        if not expiration_date:

            result["score"] -= 10

            result[
                "issues"
            ].append(

                "Data de expiração não localizada"

            )

    except TimeoutError:

        result["score"] = 50

        result[
            "issues"
        ].append(

            "Timeout na consulta WHOIS"

        )

    except Exception as error:

        result["score"] = 0

        result[
            "issues"
        ].append(

            str(error)

        )

    if result["score"] < 0:

        result["score"] = 0

    return result