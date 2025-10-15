from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    user_id: uuid.UUID


class Notification(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        orm_mode = True