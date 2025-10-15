from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.schemas.notification import Notification
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Notification])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get user's notifications
    """
    # TODO: Implement notifications retrieval logic
    return []


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Mark notification as read
    """
    # TODO: Implement mark as read logic
    return {"message": "Notification marked as read."}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Mark all notifications as read
    """
    # TODO: Implement mark all as read logic
    return {"message": "All notifications marked as read."}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a notification
    """
    # TODO: Implement notification deletion logic
    return {"message": "Notification has been deleted."}