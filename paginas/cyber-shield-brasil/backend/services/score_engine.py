def calculate_score(results):

    total_score = 0

    total_modules = 0

    for name, result in results.items():

        if not isinstance(
            result,
            dict
        ):
            continue

        if "score" not in result:
            continue

        total_score += (
            result["score"]
        )

        total_modules += 1

    if total_modules == 0:

        return {

            "score": 0,

            "grade": "F"

        }

    final_score = round(
        total_score /
        total_modules
    )

    if final_score >= 97:

        grade = "A+"

    elif final_score >= 90:

        grade = "A"

    elif final_score >= 80:

        grade = "B"

    elif final_score >= 70:

        grade = "C"

    elif final_score >= 50:

        grade = "D"

    else:

        grade = "F"

    return {

        "score": final_score,

        "grade": grade

    }