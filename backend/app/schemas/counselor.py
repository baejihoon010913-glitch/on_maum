from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime
import uuid


class StaffBase(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class CounselorProfileBase(BaseModel):
    id: uuid.UUID
    staff_id: uuid.UUID
    specialties: List[str]
    license_number: str
    experience_years: int
    education: str
    introduction: Optional[str] = None
    profile_image: Optional[str] = None
    rating: float
    total_sessions: int
    is_available: bool
    working_hours: Optional[Dict[str, Any]] = None
    languages: Optional[List[str]] = None
    session_types: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class Counselor(BaseModel):
    staff: StaffBase
    counselor_profile: CounselorProfileBase

    class Config:
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle the nested structure"""
        return cls(
            staff=StaffBase.from_orm(obj),
            counselor_profile=CounselorProfileBase.from_orm(obj.counselor_profile)
        )


class CounselorsList(BaseModel):
    items: List[Counselor]
    total: int
    skip: int
    limit: int


class TimeSlotBase(BaseModel):
    id: uuid.UUID
    counselor_id: uuid.UUID
    date: date
    start_time: time
    end_time: time
    is_available: bool
    is_booked: bool
    created_at: datetime

    class Config:
        orm_mode = True


class TimeSlot(TimeSlotBase):
    pass


class TimeSlotCreate(BaseModel):
    date: date
    start_time: time
    end_time: time
    is_available: bool = True


class TimeRange(BaseModel):
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format


class TimeSlotBulkCreate(BaseModel):
    start_date: date
    end_date: date
    time_ranges: List[TimeRange]
    exclude_dates: Optional[List[date]] = None


class CounselorAvailableSlots(BaseModel):
    counselor_id: str
    date: date
    available_slots: List[TimeSlot]


class CounselorScheduleBase(BaseModel):
    id: uuid.UUID
    counselor_id: uuid.UUID
    name: str
    description: Optional[str] = None
    days_of_week: str
    start_time: time
    end_time: time
    session_duration_minutes: int
    break_duration_minutes: int
    effective_from: date
    effective_until: Optional[date] = None
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class CounselorSchedule(CounselorScheduleBase):
    pass


class CounselorScheduleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    days_of_week: List[int]  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    session_duration_minutes: int = 50
    break_duration_minutes: int = 10
    effective_from: date
    effective_until: Optional[date] = None


class CounselorUnavailabilityBase(BaseModel):
    id: uuid.UUID
    counselor_id: uuid.UUID
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class CounselorUnavailability(CounselorUnavailabilityBase):
    pass


class CounselorUnavailabilityCreate(BaseModel):
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: str
    notes: Optional[str] = None


class CounselorReviewBase(BaseModel):
    id: uuid.UUID
    counselor_profile_id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    rating: int
    review_text: Optional[str] = None
    communication_rating: Optional[int] = None
    helpfulness_rating: Optional[int] = None
    professionalism_rating: Optional[int] = None
    is_approved: bool
    is_anonymous: bool
    created_at: datetime

    class Config:
        orm_mode = True


class CounselorReview(CounselorReviewBase):
    pass


class CounselorReviewCreate(BaseModel):
    rating: int
    review_text: Optional[str] = None
    communication_rating: Optional[int] = None
    helpfulness_rating: Optional[int] = None
    professionalism_rating: Optional[int] = None
    is_anonymous: bool = False