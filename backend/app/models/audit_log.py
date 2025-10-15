from sqlalchemy import Column, String, Text, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
import uuid
import enum
from datetime import datetime


class AuditAction(enum.Enum):
    """Enumeration of audit actions"""
    # User Management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_DEACTIVATE = "user_deactivate"
    USER_ACTIVATE = "user_activate"
    
    # Staff Management
    STAFF_CREATE = "staff_create"
    STAFF_UPDATE = "staff_update"
    STAFF_DELETE = "staff_delete"
    STAFF_ROLE_CHANGE = "staff_role_change"
    STAFF_POST_REPLY = "staff_post_reply"
    
    # Post Management
    POST_DELETE = "post_delete"
    POST_HIDE = "post_hide"
    POST_UNHIDE = "post_unhide"
    POST_PIN = "post_pin"
    POST_UNPIN = "post_unpin"
    
    # Counseling Management
    SESSION_CANCEL = "session_cancel"
    SESSION_REASSIGN = "session_reassign"
    SESSION_UPDATE = "session_update"
    
    # Report Management
    REPORT_REVIEW = "report_review"
    REPORT_RESOLVE = "report_resolve"
    REPORT_ESCALATE = "report_escalate"
    
    # System Configuration
    SYSTEM_CONFIG_UPDATE = "system_config_update"
    BACKUP_CREATE = "backup_create"
    BACKUP_RESTORE = "backup_restore"
    
    # Login/Logout
    ADMIN_LOGIN = "admin_login"
    ADMIN_LOGOUT = "admin_logout"
    STAFF_LOGIN = "staff_login"
    STAFF_LOGOUT = "staff_logout"


class AuditSeverity(enum.Enum):
    """Audit log severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditLog(Base):
    """
    Audit log model to track all admin and staff activities
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Who performed the action
    staff_id = Column(UUID(as_uuid=True), ForeignKey('staff.id'), nullable=False)
    staff_name = Column(String(100), nullable=False)  # Denormalized for historical tracking
    staff_role = Column(String(50), nullable=False)   # Role at time of action
    
    # What action was performed
    action = Column(Enum(AuditAction), nullable=False)
    action_description = Column(Text, nullable=False)
    severity = Column(Enum(AuditSeverity), nullable=False, default=AuditSeverity.MEDIUM)
    
    # Target of the action (what was affected)
    target_type = Column(String(50), nullable=True)  # e.g., 'user', 'post', 'session'
    target_id = Column(String(100), nullable=True)   # ID of the affected entity
    target_name = Column(String(200), nullable=True) # Name/title of affected entity
    
    # Additional context data
    details = Column(JSON, nullable=True)  # Store additional context as JSON
    
    # Request information
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True)  # For correlation
    
    # Result information
    success = Column(String(10), nullable=False, default="success")  # success, failed, error
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    staff = relationship("Staff", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, staff={self.staff_name}, target={self.target_type}:{self.target_id})>"

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            "id": str(self.id),
            "staff_id": str(self.staff_id),
            "staff_name": self.staff_name,
            "staff_role": self.staff_role,
            "action": self.action.value,
            "action_description": self.action_description,
            "severity": self.severity.value,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "target_name": self.target_name,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "request_id": self.request_id,
            "success": self.success,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def create_log(
        cls,
        staff_id: uuid.UUID,
        staff_name: str,
        staff_role: str,
        action: AuditAction,
        action_description: str,
        severity: AuditSeverity = AuditSeverity.MEDIUM,
        target_type: str = None,
        target_id: str = None,
        target_name: str = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
        success: str = "success",
        error_message: str = None,
    ):
        """
        Factory method to create audit log entries
        """
        return cls(
            staff_id=staff_id,
            staff_name=staff_name,
            staff_role=staff_role,
            action=action,
            action_description=action_description,
            severity=severity,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            success=success,
            error_message=error_message,
        )