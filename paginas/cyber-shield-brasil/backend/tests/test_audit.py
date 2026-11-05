import requests
import json

response = requests.post(
    "http://127.0.0.1:5000/api/audit/full",
    json={
        "url": "https://www.microsoft.com"
    }
)

print("Status:", response.status_code)

try:

    print(
        json.dumps(
            response.json(),
            indent=4,
            ensure_ascii=False
        )
    )

except Exception:

    print(response.text)