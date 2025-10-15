from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nickname = Column(String, unique=True, nullable=False)
    profile_image = Column(String, nullable=True)
    birth_year = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)  # 'male', 'female', 'other'
    is_active = Column(Boolean, default=True)
    
    # SNS OAuth fields
    sns_provider = Column(String, nullable=True)  # 'naver', 'kakao', etc.
    sns_id = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    posts = relationship("Post", back_populates="user")
    diaries = relationship("Diary", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    counselor_reviews = relationship("CounselorReview", back_populates="user")
    empathies = relationship("Empathy", back_populates="user")
    emoji_reactions = relationship("EmojiReaction", back_populates="user")
    notifications = relationship("Notification", back_populates="user")