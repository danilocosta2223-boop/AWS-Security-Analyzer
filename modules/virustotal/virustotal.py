import os
import requests

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv(
    "VT_API_KEY"
)

print("\n================================")
print("MODULO VIRUSTOTAL CARREGADO")
print("VT_API_KEY =", API_KEY)
print("================================\n")


def analyze_virustotal(target):

    if not API_KEY:

        return {

            "success": False,

            "message":
            "VT_API_KEY não encontrada"

        }

    return {

        "success": True,

        "target": target,

        "provider": "VirusTotal",

        "api_loaded": True

    }
