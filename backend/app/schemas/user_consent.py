from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class UserConsentBase(BaseModel):
    consent_type: str
    consent_granted: bool
    consent_details: Optional[Dict[str, Any]] = None


class UserConsentCreate(UserConsentBase):
    pass


class UserConsentResponse(UserConsentBase):
    consent_id: uuid.UUID
    granted_at: datetime
    expires_at: Optional[datetime] = None
    can_revoke: bool = True

    class Config:
        from_attributes = True


class UserConsentHistory(BaseModel):
    consent_id: uuid.UUID
    consent_type: str
    consent_granted: bool
    granted_at: datetime
    expires_at: Optional[datetime] = None
    last_accessed: Optional[datetime] = None
    access_count: int

    class Config:
        from_attributes = True


class UserConsentsResponse(BaseModel):
    consents: list[UserConsentHistory]
    privacy_info: Dict[str, str] = {
        "data_anonymization": "Session-specific temporary ID used",
        "data_retention": "Immediately deleted when consent is revoked", 
        "access_control": "Only assigned counselor can access during session"
    }