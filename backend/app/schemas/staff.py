"""
Pydantic schemas for staff authentication and management
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class StaffRole(str, Enum):
    ADMIN = "admin"
    COUNSELOR = "counselor"
    MODERATOR = "moderator"
    SUPPORT = "support"


class StaffLogin(BaseModel):
    """Schema for staff login"""
    email: EmailStr
    password: str


class StaffLoginResponse(BaseModel):
    """Schema for staff login response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    staff: 'StaffInfo'


class StaffInfo(BaseModel):
    """Basic staff information"""
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str]
    role: StaffRole
    department: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    """Schema for creating new staff"""
    name: str
    email: EmailStr
    phone: Optional[str]
    role: StaffRole
    department: Optional[str]
    password: str
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class StaffUpdate(BaseModel):
    """Schema for updating staff information"""
    name: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    department: Optional[str]
    is_active: Optional[bool]
    
    @validator('name')
    def validate_name(cls, v):
        if v and len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip() if v else v


class StaffRoleUpdate(BaseModel):
    """Schema for updating staff role"""
    role: StaffRole


class StaffPasswordChange(BaseModel):
    """Schema for changing staff password"""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class StaffPasswordReset(BaseModel):
    """Schema for password reset"""
    email: EmailStr


class StaffPasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class AuditLogResponse(BaseModel):
    """Schema for audit log response"""
    id: uuid.UUID
    staff_id: uuid.UUID
    staff_name: str
    staff_role: str
    action: str
    action_description: str
    severity: str
    target_type: Optional[str]
    target_id: Optional[str]
    target_name: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_id: Optional[str]
    success: str
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    """Schema for dashboard statistics"""
    total_users: int
    active_users_today: int
    total_posts: int
    posts_today: int
    total_sessions: int
    sessions_today: int
    pending_reports: int


class UserStatsResponse(BaseModel):
    """Schema for user statistics"""
    total_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    active_users_today: int
    active_users_this_week: int
    user_growth_rate: float


class SessionStatsResponse(BaseModel):
    """Schema for session statistics"""
    total_sessions: int
    sessions_today: int
    sessions_this_week: int
    sessions_this_month: int
    average_session_duration: float
    completion_rate: float
    cancellation_rate: float


class PostStatsResponse(BaseModel):
    """Schema for post statistics"""
    total_posts: int
    posts_today: int
    posts_this_week: int
    posts_this_month: int
    public_posts: int
    private_posts: int
    average_empathy_count: float


class ReportSummary(BaseModel):
    """Schema for report summary"""
    id: uuid.UUID
    post_id: uuid.UUID
    reporter_id: uuid.UUID
    reason: str
    description: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Update forward references
StaffLoginResponse.model_rebuild()