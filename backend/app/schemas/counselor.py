from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime
import uuid

# --- Staff 관련 스키마 ---
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
        from_attributes = True

# --- CounselorProfile 관련 스키마 ---
class CounselorProfile(BaseModel):
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
        from_attributes = True

class CounselorProfileCreate(BaseModel):
    specialties: List[str]
    license_number: str
    experience_years: int
    education: str
    introduction: str
    working_hours: Optional[str] = None

# --- Counselor 관련 스키마 ---
class Counselor(BaseModel):
    staff: StaffBase
    counselor_profile: CounselorProfile

    class Config:
        from_attributes = True

class CounselorsList(BaseModel):
    items: List[Counselor]
    total: int
    skip: int
    limit: int

# --- [추가] 아래 클래스가 누락되었습니다 ---
# API 응답을 위한 스키마입니다. staff 정보와 counselor_profile 정보를 포함합니다.
class CounselorProfileResponse(BaseModel):
    staff: StaffBase
    counselor_profile: CounselorProfile

    class Config:
        from_attributes = True


# --- TimeSlot (상담 시간) 관련 스키마 ---
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
        from_attributes = True

class TimeSlot(TimeSlotBase):
    pass

class TimeSlotCreate(BaseModel):
    date: date
    start_time: time
    end_time: time
    is_available: bool = True

class TimeRange(BaseModel):
    start_time: str
    end_time: str

class TimeSlotBulkCreate(BaseModel):
    start_date: date
    end_date: date
    time_ranges: List[TimeRange]
    exclude_dates: Optional[List[date]] = None

class CounselorAvailableSlots(BaseModel):
    counselor_id: str
    date: date
    available_slots: List[TimeSlot]

# --- CounselorSchedule (상담사 스케줄) 관련 스키마 ---
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
        from_attributes = True

class CounselorSchedule(CounselorScheduleBase):
    pass

class CounselorScheduleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    days_of_week: List[int]
    start_time: time
    end_time: time
    session_duration_minutes: int = 50
    break_duration_minutes: int = 10
    effective_from: date
    effective_until: Optional[date] = None

# --- CounselorUnavailability (상담 불가 시간) 관련 스키마 ---
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
        from_attributes = True

class CounselorUnavailability(CounselorUnavailabilityBase):
    pass

class CounselorUnavailabilityCreate(BaseModel):
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: str
    notes: Optional[str] = None

# --- CounselorReview (상담사 리뷰) 관련 스키마 ---
class CounselorReviewFields(BaseModel):
    rating: int
    review_text: Optional[str] = None
    communication_rating: Optional[int] = None
    helpfulness_rating: Optional[int] = None
    professionalism_rating: Optional[int] = None
    is_anonymous: bool = False

class CounselorReviewCreate(CounselorReviewFields):
    pass

class CounselorReview(CounselorReviewFields):
    id: uuid.UUID
    counselor_profile_id: uuid.UUID
    user_id: uuid.UUID
    session_id: uuid.UUID
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True