from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import uuid


class ChatSessionBase(BaseModel):
    counselor_id: uuid.UUID
    scheduled_date: date
    scheduled_start_time: str
    scheduled_end_time: str
    category: Optional[str] = None
    description: Optional[str] = None


class ChatSessionCreate(ChatSessionBase):
    time_slot_id: Optional[uuid.UUID] = None


class ChatSessionUpdate(BaseModel):
    status: Optional[str] = None
    counselor_notes: Optional[str] = None
    user_feedback: Optional[str] = None
    rating: Optional[int] = None


class ChatSession(ChatSessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    duration: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True