from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None


class SNSLoginRequest(BaseModel):
    code: str
    state: str


class OnboardingRequest(BaseModel):
    sns_provider: str
    sns_id: str
    email: EmailStr
    nickname: str
    birth_year: int
    gender: str


class SNSProfile(BaseModel):
    provider: str
    sns_id: str
    email: EmailStr
    name: str
    profile_image: Optional[str] = None


class LoginResponse(BaseModel):
    is_new_user: bool
    user: Optional[dict] = None
    tokens: Optional[Token] = None
    sns_profile: Optional[SNSProfile] = None


class AuthTokens(BaseModel):
    access_token: str
    refresh_token: str  
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AccountDeletionRequest(BaseModel):
    confirmation_text: str
    reason: Optional[str] = None


class AccountDeletionResponse(BaseModel):
    message: str
    deleted_at: str
    data_retention_info: dict