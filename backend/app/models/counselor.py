from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class Counselor(Base):
    __tablename__ = "counselors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CounselorProfile(Base):
    __tablename__ = "counselor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("counselors.id"), nullable=False)
    specialties = Column(ARRAY(String), nullable=True)
    license_number = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    education = Column(Text, nullable=True)
    introduction = Column(Text, nullable=True)
    profile_image = Column(String, nullable=True)
    rating = Column(Float, default=0.0)
    total_sessions = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    working_hours = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())