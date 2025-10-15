from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class UserBase(BaseModel):
    email: EmailStr
    nickname: str
    birth_year: Optional[int] = None
    gender: Optional[str] = None


class UserCreate(UserBase):
    sns_provider: Optional[str] = None
    sns_id: Optional[str] = None


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_image: Optional[str] = None
    birth_year: Optional[int] = None
    gender: Optional[str] = None


class UserInDB(UserBase):
    id: uuid.UUID
    profile_image: Optional[str] = None
    is_active: bool
    sns_provider: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True


class User(UserInDB):
    pass