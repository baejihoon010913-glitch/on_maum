from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False)  # 'counselor', 'admin'
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    counselor_profile = relationship("CounselorProfile", back_populates="staff", uselist=False)
    time_slots = relationship("TimeSlot", back_populates="counselor")
    schedules = relationship("CounselorSchedule", foreign_keys="CounselorSchedule.counselor_id", back_populates="counselor")
    unavailabilities = relationship("CounselorUnavailability", foreign_keys="CounselorUnavailability.counselor_id", back_populates="counselor")
    counselor_sessions = relationship("ChatSession", back_populates="counselor")