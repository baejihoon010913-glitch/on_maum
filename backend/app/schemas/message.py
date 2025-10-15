from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase):
    id: uuid.UUID
    session_id: uuid.UUID
    sender_id: uuid.UUID
    sender_type: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True