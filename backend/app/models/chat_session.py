from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("counselors.id"), nullable=False)
    status = Column(String, default="pending")  # 'pending', 'active', 'completed', 'cancelled'
    scheduled_date = Column(DateTime, nullable=False)
    scheduled_start_time = Column(String, nullable=False)
    scheduled_end_time = Column(String, nullable=False)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    category = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    counselor_notes = Column(Text, nullable=True)
    user_feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())