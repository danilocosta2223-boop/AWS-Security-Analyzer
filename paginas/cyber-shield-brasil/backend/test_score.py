from services.score_engine import (
    calculate_score
)

resultado = calculate_score({

    "ssl": {
        "score": 100
    },

    "headers": {
        "score": 17
    },

    "robots": {
        "score": 90
    },

    "sitemap": {
        "score": 90
    },

    "exposure": {
        "score": 85
    }

})

print(resultado)