from pydantic import BaseModel
from typing import Optional
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