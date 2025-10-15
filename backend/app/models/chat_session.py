from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    time_slot_id = Column(UUID(as_uuid=True), ForeignKey("time_slots.id"), nullable=True)
    
    status = Column(String, default="pending")  # 'pending', 'active', 'completed', 'cancelled'
    
    # Scheduling information
    scheduled_date = Column(Date, nullable=False)
    scheduled_start_time = Column(Time, nullable=False)
    scheduled_end_time = Column(Time, nullable=False)
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
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    counselor = relationship("Staff", back_populates="counselor_sessions")
    time_slot = relationship("TimeSlot", back_populates="chat_session")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    review = relationship("CounselorReview", back_populates="session", uselist=False)