from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class CounselorProfile(Base):
    """
    Extended profile information for counselors.
    Contains professional information, specialties, and service details.
    """
    __tablename__ = "counselor_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), unique=True, nullable=False)
    
    # Professional credentials
    specialties = Column(JSON, nullable=False)  # Array of specialty strings
    license_number = Column(String(50), nullable=False)
    experience_years = Column(Integer, default=0, nullable=False)
    education = Column(Text, nullable=False)
    
    # Profile information
    introduction = Column(Text, nullable=True)
    profile_image = Column(String(500), nullable=True)  # URL to image
    
    # Service metrics
    rating = Column(Float, default=0.0, nullable=False)  # Average rating 0.0-5.0
    total_sessions = Column(Integer, default=0, nullable=False)
    
    # Availability
    is_available = Column(Boolean, default=True, nullable=False)
    working_hours = Column(JSON, nullable=True)  # Flexible working hours JSON
    
    # Languages spoken
    languages = Column(JSON, nullable=True)  # Array of language codes
    
    # Session preferences
    session_types = Column(JSON, nullable=True)  # Array of session types (individual, group, etc.)
    
    # details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    staff = relationship("Staff", back_populates="counselor_profile")
    reviews = relationship("CounselorReview", back_populates="counselor_profile")