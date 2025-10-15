from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class CounselorReview(Base):
    """
    User reviews and ratings for counselors.
    Connected to completed chat sessions.
    """
    __tablename__ = "counselor_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counselor_profile_id = Column(UUID(as_uuid=True), ForeignKey("counselor_profiles.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text, nullable=True)
    
    # Review categories (optional detailed ratings)
    communication_rating = Column(Integer, nullable=True)  # 1-5
    helpfulness_rating = Column(Integer, nullable=True)    # 1-5
    professionalism_rating = Column(Integer, nullable=True) # 1-5
    
    # Moderation
    is_approved = Column(Boolean, default=True, nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    
    # details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    counselor_profile = relationship("CounselorProfile", back_populates="reviews")
    user = relationship("User", back_populates="counselor_reviews")
    session = relationship("ChatSession", back_populates="review", uselist=False)