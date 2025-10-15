from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class PostBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    is_private: bool = False


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_private: Optional[bool] = None


class PostInDB(PostBase):
    id: uuid.UUID
    user_id: uuid.UUID
    view_count: int
    empathy_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class Post(PostInDB):
    is_empathized: bool = False
    emoji_reactions: list = []
    author: dict = {}