from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
import uuid


class ChatSessionBase(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    counselor_id: uuid.UUID
    time_slot_id: Optional[uuid.UUID] = None
    status: str
    scheduled_date: date
    scheduled_start_time: time
    scheduled_end_time: time
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    duration: Optional[int] = None  # in minutes
    category: Optional[str] = None
    description: Optional[str] = None
    counselor_notes: Optional[str] = None
    user_feedback: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSession(ChatSessionBase):
    pass


class ChatSessionCreate(BaseModel):
    counselor_id: str
    scheduled_date: date
    start_time: time
    end_time: time
    concern_category: str
    description: str
    time_slot_id: Optional[str] = None


class ChatSessionUpdate(BaseModel):
    counselor_notes: Optional[str] = None
    user_feedback: Optional[str] = None
    rating: Optional[int] = None


class ChatSessionBookingResponse(BaseModel):
    session_id: str
    status: str
    message: str


class MessageBase(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    sender_id: uuid.UUID
    sender_type: str  # "user" or "counselor"
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Message(MessageBase):
    pass


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    session_id: str
    sender_id: str
    sender_type: str
    content: str
    created_at: datetime


class ChatSessionsList(BaseModel):
    items: List[ChatSession]
    total: int
    skip: int
    limit: int


class WebSocketMessage(BaseModel):
    type: str  # "message", "user_joined", "user_left", "session_started", "session_ended"
    data: dict
    timestamp: datetime = None

    def __init__(self, **data):
        if data.get('timestamp') is None:
            data['timestamp'] = datetime.utcnow()
        super().__init__(**data)


class ChatRoomInfo(BaseModel):
    session_id: str
    status: str
    participants: List[dict]
    message_count: int
    started_at: Optional[datetime] = None