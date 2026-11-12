from flask import Blueprint
from flask import jsonify
from flask import request

from backend.database.database import (
    get_reports
)

from backend.services.report_service import (
    generate_report
)

reports_bp = Blueprint(
    "reports",
    __name__
)


@reports_bp.route(
    "/",
    methods=["GET"]
)
def reports():

    data = get_reports()

    return jsonify({

        "success": True,

        "total": len(data),

        "reports": data

    })


@reports_bp.route(
    "/generate",
    methods=["POST"]
)
def generate():

    payload = request.get_json() or {}

    report_format = payload.get(
        "format",
        "pdf"
    )

    data = payload.get(
        "data",
        {}
    )

    result = generate_report(
        data,
        report_format
    )

    return jsonify(
        result
    )