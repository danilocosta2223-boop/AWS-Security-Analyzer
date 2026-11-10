from flask import Blueprint
from flask import jsonify

from backend.database.database import (
    get_reports
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