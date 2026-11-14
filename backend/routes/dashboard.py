from flask import Blueprint
from flask import jsonify

from backend.database.database import (
    get_dashboard_stats
)

dashboard_bp = Blueprint(
    "dashboard",
    __name__
)


@dashboard_bp.route(
    "/",
    methods=["GET"]
)
def dashboard():

    return jsonify(
        get_dashboard_stats()
    )