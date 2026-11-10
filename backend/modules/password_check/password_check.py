import re


def check_password(password):

    score = 0

    issues = []

    if len(password) >= 8:
        score += 20
    else:
        issues.append(
            "Senha com menos de 8 caracteres"
        )

    if len(password) >= 12:
        score += 20

    if re.search(r"[A-Z]", password):
        score += 15
    else:
        issues.append(
            "Falta letra maiúscula"
        )

    if re.search(r"[a-z]", password):
        score += 15
    else:
        issues.append(
            "Falta letra minúscula"
        )

    if re.search(r"\d", password):
        score += 15
    else:
        issues.append(
            "Falta número"
        )

    if re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        score += 15
    else:
        issues.append(
            "Falta caractere especial"
        )

    if score >= 85:

        level = "Muito Forte"

    elif score >= 65:

        level = "Forte"

    elif score >= 40:

        level = "Média"

    else:

        level = "Fraca"

    return {

        "success": True,

        "score": score,

        "level": level,

        "length": len(password),

        "issues": issues

    }