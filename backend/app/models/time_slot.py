from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Time, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.base_class import Base


class TimeSlot(Base):
    """
    Time slots represent available appointment times for counselors.
    Generated automatically by scheduler or created manually.
    """
    __tablename__ = "time_slots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)
    
    # Auto-generated slots have this set to the schedule rule that created them
    generated_from_schedule_id = Column(UUID(as_uuid=True), ForeignKey("counselor_schedules.id"), nullable=True)
    
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships
    counselor = relationship("Staff", back_populates="time_slots")
    generated_from_schedule = relationship("CounselorSchedule", back_populates="generated_slots")
    chat_session = relationship("ChatSession", back_populates="time_slot", uselist=False)


class CounselorSchedule(Base):
    """
    Recurring schedule rules for counselors.
    Used by scheduler to automatically generate TimeSlot entries.
    """
    __tablename__ = "counselor_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    
    # Schedule rule details
    name = Column(String(100), nullable=False)  # e.g., "Weekly Morning Sessions"
    description = Column(String(500), nullable=True)
    
    # Days of week (0=Monday, 6=Sunday) - stored as comma-separated string
    days_of_week = Column(String(20), nullable=False)  # e.g., "0,1,2,3,4" for weekdays
    
    # Time range for each day
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Session duration in minutes
    session_duration_minutes = Column(Integer, default=50, nullable=False)
    
    # Break between sessions in minutes
    break_duration_minutes = Column(Integer, default=10, nullable=False)
    
    # Schedule validity period
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)  # NULL means indefinite
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    
    # Relationships
    counselor = relationship("Staff", foreign_keys=[counselor_id], back_populates="schedules")
    created_by_staff = relationship("Staff", foreign_keys=[created_by])
    generated_slots = relationship("TimeSlot", back_populates="generated_from_schedule")
    unavailabilities = relationship("CounselorUnavailability", back_populates="schedule")


class CounselorUnavailability(Base):
    """
    Specific dates/times when a counselor is unavailable.
    Overrides the regular schedule for those periods.
    """
    __tablename__ = "counselor_unavailabilities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counselor_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("counselor_schedules.id"), nullable=True)
    
    # Unavailability period
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)  # NULL means all day
    end_time = Column(Time, nullable=True)    # NULL means all day
    
    # Reason and notes
    reason = Column(String(50), nullable=False)  # vacation, sick_leave, training, personal, etc.
    notes = Column(String(500), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    
    # Relationships
    counselor = relationship("Staff", foreign_keys=[counselor_id], back_populates="unavailabilities")
    schedule = relationship("CounselorSchedule", back_populates="unavailabilities")
    created_by_staff = relationship("Staff", foreign_keys=[created_by])