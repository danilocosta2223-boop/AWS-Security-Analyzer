from flask import Blueprint
from flask import request
from flask import jsonify

from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

from backend.services.ssl_analyzer import analyze_ssl
from backend.services.headers_analyzer import analyze_headers
from backend.services.robots_analyzer import analyze_robots
from backend.services.sitemap_analyzer import analyze_sitemap
from backend.services.exposure_analyzer import analyze_exposure

from backend.services.dns_analyzer import analyze_dns
from backend.services.cookie_analyzer import analyze_cookies
from backend.services.cors_analyzer import analyze_cors
from backend.services.server_analyzer import analyze_server

from backend.services.technology_detector import (
    detect_technology
)

from backend.services.owasp_analyzer import (
    analyze_owasp
)

from backend.services.ports_analyzer import (
    analyze_ports
)

from backend.services.reputation_analyzer import (
    analyze_reputation
)

from backend.services.recon_analyzer import (
    analyze_recon
)

from backend.integrations.whois_lookup import (
    analyze_whois
)

from backend.services.score_engine import (
    calculate_score
)

audit_bp = Blueprint(
    "audit",
    __name__
)

ANALYZERS = {
    "ssl": analyze_ssl,
    "headers": analyze_headers,
    "robots": analyze_robots,
    "sitemap": analyze_sitemap,
    "exposure": analyze_exposure,
    "dns": analyze_dns,
    "cookies": analyze_cookies,
    "cors": analyze_cors,
    "server": analyze_server,
    "technology": detect_technology,
    "owasp": analyze_owasp,
    "ports": analyze_ports,
    "reputation": analyze_reputation,
    "whois": analyze_whois,
    "recon": analyze_recon,
}

@audit_bp.route(
    "/",
    methods=["GET"]
)
def audit_home():

    return jsonify({
        "module": "Audit Engine",
        "status": "online",
        "endpoint": "/api/audit/full"
    })

@audit_bp.route(
    "/full",
    methods=["POST"]
)
def full_audit():

    data = request.get_json() or {}

    url = data.get(
        "url",
        ""
    )

    if not url:
        return jsonify({
            "error": "URL não informada"
        }), 400

    results = {}

    with ThreadPoolExecutor(
        max_workers=len(ANALYZERS)
    ) as executor:

        future_to_key = {
            executor.submit(
                func,
                url
            ): key

            for key, func
            in ANALYZERS.items()
        }

        for future in as_completed(
            future_to_key
        ):

            key = future_to_key[
                future
            ]

            try:

                results[key] = (
                    future.result()
                )

            except Exception as error:

                results[key] = {
                    "score": 0,
                    "error": str(error)
                }

    final_score = calculate_score(
        results
    )

    response_data = {
        "url": url,
        "score": final_score.get(
            "score"
        ),
        "grade": final_score.get(
            "grade"
        )
    }

    response_data.update(
        results
    )

    return jsonify(
        response_data
    )