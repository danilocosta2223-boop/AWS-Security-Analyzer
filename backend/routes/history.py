from flask import Blueprint
from flask import jsonify

from backend.services.history_service import (
    HistoryService
)

history_bp = Blueprint(
    "history",
    __name__
)

@history_bp.route(
    "/",
    methods=["GET"]
)
def get_history():

    scans = HistoryService.get_all()

    return jsonify({
        "success": True,
        "total": len(scans),
        "data": scans
    })