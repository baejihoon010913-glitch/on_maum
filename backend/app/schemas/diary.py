from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class DiaryBase(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None


class DiaryCreate(DiaryBase):
    pass


class DiaryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None


class DiaryInDB(DiaryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class Diary(DiaryInDB):
    pass


class DiaryStatistics(BaseModel):
    year: int
    month: int
    total_entries: int
    mood_distribution: Dict[str, int]
    most_active_day: Optional[int] = None
    writing_streak: int
    average_length: float