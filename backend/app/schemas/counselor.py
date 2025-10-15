from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class CounselorBase(BaseModel):
    staff_id: uuid.UUID


class Counselor(CounselorBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        orm_mode = True


class CounselorProfileBase(BaseModel):
    specialties: Optional[List[str]] = []
    license_number: Optional[str] = None
    experience_years: int = 0
    education: Optional[str] = None
    introduction: Optional[str] = None
    profile_image: Optional[str] = None
    is_available: bool = True
    working_hours: Optional[str] = None


class CounselorProfile(CounselorProfileBase):
    id: uuid.UUID
    counselor_id: uuid.UUID
    rating: float
    total_sessions: int
    created_at: datetime

    class Config:
        orm_mode = True