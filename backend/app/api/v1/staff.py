from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/dashboard")
def get_staff_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get staff dashboard data
    """
    # TODO: Implement staff dashboard logic
    return {"message": "Staff dashboard - Not implemented yet"}