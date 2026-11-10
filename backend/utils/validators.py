import re


def validate_domain(domain):

    pattern = r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    return bool(
        re.match(
            pattern,
            domain
        )
    )


def validate_email(email):

    pattern = r"^[^@]+@[^@]+\.[^@]+$"

    return bool(
        re.match(
            pattern,
            email
        )
    )


def validate_ip(ip):

    pattern = (
        r"^((25[0-5]|2[0-4][0-9]|"
        r"[01]?[0-9][0-9]?)\.){3}"
        r"(25[0-5]|2[0-4][0-9]|"
        r"[01]?[0-9][0-9]?)$"
    )

    return bool(
        re.match(
            pattern,
            ip
        )
    )
