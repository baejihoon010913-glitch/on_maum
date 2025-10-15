from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get admin dashboard data
    """
    # TODO: Implement admin dashboard logic
    return {"message": "Admin dashboard - Not implemented yet"}