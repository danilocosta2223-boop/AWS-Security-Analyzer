from backend.services.audit_service import (
    run_audit
)


def execute(
    target
):

    return run_audit(
        target
    )