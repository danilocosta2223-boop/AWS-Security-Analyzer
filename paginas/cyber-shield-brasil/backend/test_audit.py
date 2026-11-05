import requests
import json

response = requests.post(
    "http://127.0.0.1:5000/api/audit/full",
    json={
        "url": "https://www.google.com"
    }
)

print(
    json.dumps(
        response.json(),
        indent=4,
        ensure_ascii=False
    )
)