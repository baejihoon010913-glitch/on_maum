"""
Staff management service
Handles staff CRUD operations, authentication, and role management
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uuid

from app.models.staff import Staff
from app.models.audit_log import AuditLog, AuditAction, AuditSeverity
from app.models.user import User
from app.models.chat_session import ChatSession
from app.models.post import Post
from app.models.report import Report
from app.schemas.staff import StaffCreate, StaffUpdate, StaffRoleUpdate
from app.core.security import create_access_token, create_refresh_token
from app.core.rbac import StaffRole


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class StaffService:
    """Service class for staff management operations"""

    @staticmethod
    def authenticate_staff(db: Session, email: str, password: str) -> Optional[Staff]:
        """
        Authenticate staff member with email and password
        """
        staff = db.query(Staff).filter(
            and_(Staff.email == email, Staff.is_active == True)
        ).first()
        
        if staff and pwd_context.verify(password, staff.hashed_password):
            return staff
        return None

    @staticmethod
    def create_staff_tokens(staff: Staff) -> Dict[str, Any]:
        """
        Create access and refresh tokens for staff
        """
        access_token_expires = timedelta(hours=8)  # Shorter for staff
        refresh_token_expires = timedelta(days=7)
        
        access_token = create_access_token(
            data={"sub": str(staff.id), "type": "staff_access", "role": staff.role},
            expires_delta=access_token_expires
        )
        
        refresh_token = create_refresh_token(
            data={"sub": str(staff.id), "type": "staff_refresh"},
            expires_delta=refresh_token_expires
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds())
        }

    @staticmethod
    def get_staff_by_id(db: Session, staff_id: uuid.UUID) -> Optional[Staff]:
        """Get staff by ID"""
        return db.query(Staff).filter(Staff.id == staff_id).first()

    @staticmethod
    def get_staff_by_email(db: Session, email: str) -> Optional[Staff]:
        """Get staff by email"""
        return db.query(Staff).filter(Staff.email == email).first()

    @staticmethod
    def get_all_staff(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        role: Optional[str] = None,
        department: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Staff]:
        """
        Get all staff with optional filtering
        """
        query = db.query(Staff)
        
        if role:
            query = query.filter(Staff.role == role)
        if department:
            query = query.filter(Staff.department == department)
        if is_active is not None:
            query = query.filter(Staff.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def create_staff(db: Session, staff_data: StaffCreate, creator_staff: Staff) -> Staff:
        """
        Create new staff member
        """
        # Check if email already exists
        existing_staff = StaffService.get_staff_by_email(db, staff_data.email)
        if existing_staff:
            raise ValueError("Email already registered")
        
        # Hash password
        hashed_password = pwd_context.hash(staff_data.password)
        
        # Create staff
        db_staff = Staff(
            name=staff_data.name,
            email=staff_data.email,
            phone=staff_data.phone,
            role=staff_data.role.value,
            department=staff_data.department,
            hashed_password=hashed_password,
            is_active=True,
        )
        
        db.add(db_staff)
        db.flush()  # Get the ID
        
        # Log the action
        AuditLogService.create_log(
            db=db,
            staff_id=creator_staff.id,
            staff_name=creator_staff.name,
            staff_role=creator_staff.role,
            action=AuditAction.STAFF_CREATE,
            action_description=f"Created new staff member: {staff_data.name} ({staff_data.email})",
            severity=AuditSeverity.HIGH,
            target_type="staff",
            target_id=str(db_staff.id),
            target_name=staff_data.name,
            details={
                "role": staff_data.role.value,
                "department": staff_data.department,
            }
        )
        
        db.commit()
        db.refresh(db_staff)
        return db_staff

    @staticmethod
    def update_staff(
        db: Session, 
        staff_id: uuid.UUID, 
        staff_data: StaffUpdate,
        updater_staff: Staff
    ) -> Optional[Staff]:
        """
        Update staff information
        """
        staff = StaffService.get_staff_by_id(db, staff_id)
        if not staff:
            return None
        
        # Store original values for audit
        original_values = {
            "name": staff.name,
            "email": staff.email,
            "phone": staff.phone,
            "department": staff.department,
            "is_active": staff.is_active,
        }
        
        # Update fields
        update_data = staff_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(staff, field, value)
        
        # Log the action
        AuditLogService.create_log(
            db=db,
            staff_id=updater_staff.id,
            staff_name=updater_staff.name,
            staff_role=updater_staff.role,
            action=AuditAction.STAFF_UPDATE,
            action_description=f"Updated staff member: {staff.name}",
            severity=AuditSeverity.MEDIUM,
            target_type="staff",
            target_id=str(staff.id),
            target_name=staff.name,
            details={
                "original": original_values,
                "updated": update_data,
            }
        )
        
        db.commit()
        db.refresh(staff)
        return staff

    @staticmethod
    def update_staff_role(
        db: Session,
        staff_id: uuid.UUID,
        role_data: StaffRoleUpdate,
        updater_staff: Staff
    ) -> Optional[Staff]:
        """
        Update staff role (admin only operation)
        """
        staff = StaffService.get_staff_by_id(db, staff_id)
        if not staff:
            return None
        
        original_role = staff.role
        staff.role = role_data.role.value
        
        # Log the action
        AuditLogService.create_log(
            db=db,
            staff_id=updater_staff.id,
            staff_name=updater_staff.name,
            staff_role=updater_staff.role,
            action=AuditAction.STAFF_ROLE_CHANGE,
            action_description=f"Changed role of {staff.name} from {original_role} to {role_data.role.value}",
            severity=AuditSeverity.HIGH,
            target_type="staff",
            target_id=str(staff.id),
            target_name=staff.name,
            details={
                "original_role": original_role,
                "new_role": role_data.role.value,
            }
        )
        
        db.commit()
        db.refresh(staff)
        return staff

    @staticmethod
    def deactivate_staff(
        db: Session,
        staff_id: uuid.UUID,
        deactivator_staff: Staff
    ) -> Optional[Staff]:
        """
        Deactivate staff member
        """
        staff = StaffService.get_staff_by_id(db, staff_id)
        if not staff:
            return None
        
        staff.is_active = False
        
        # Log the action
        AuditLogService.create_log(
            db=db,
            staff_id=deactivator_staff.id,
            staff_name=deactivator_staff.name,
            staff_role=deactivator_staff.role,
            action=AuditAction.STAFF_DELETE,
            action_description=f"Deactivated staff member: {staff.name}",
            severity=AuditSeverity.HIGH,
            target_type="staff",
            target_id=str(staff.id),
            target_name=staff.name,
        )
        
        db.commit()
        db.refresh(staff)
        return staff

    @staticmethod
    def change_password(
        db: Session,
        staff_id: uuid.UUID,
        current_password: str,
        new_password: str
    ) -> bool:
        """
        Change staff password
        """
        staff = StaffService.get_staff_by_id(db, staff_id)
        if not staff:
            return False
        
        # Verify current password
        if not pwd_context.verify(current_password, staff.hashed_password):
            return False
        
        # Update password
        staff.hashed_password = pwd_context.hash(new_password)
        
        # Log the action
        AuditLogService.create_log(
            db=db,
            staff_id=staff.id,
            staff_name=staff.name,
            staff_role=staff.role,
            action=AuditAction.STAFF_UPDATE,
            action_description="Changed password",
            severity=AuditSeverity.MEDIUM,
            target_type="staff",
            target_id=str(staff.id),
            target_name=staff.name,
        )
        
        db.commit()
        return True


class AuditLogService:
    """Service for audit log operations"""
    
    @staticmethod
    def create_log(
        db: Session,
        staff_id: uuid.UUID,
        staff_name: str,
        staff_role: str,
        action: AuditAction,
        action_description: str,
        severity: AuditSeverity = AuditSeverity.MEDIUM,
        target_type: str = None,
        target_id: str = None,
        target_name: str = None,
        details: Dict[str, Any] = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
        success: str = "success",
        error_message: str = None,
    ) -> AuditLog:
        """
        Create audit log entry
        """
        log_entry = AuditLog.create_log(
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
        
        db.add(log_entry)
        return log_entry

    @staticmethod
    def get_audit_logs(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        staff_id: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        target_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AuditLog]:
        """
        Get audit logs with filtering
        """
        query = db.query(AuditLog)
        
        if staff_id:
            query = query.filter(AuditLog.staff_id == staff_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if severity:
            query = query.filter(AuditLog.severity == severity)
        if target_type:
            query = query.filter(AuditLog.target_type == target_type)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        return query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()


class DashboardService:
    """Service for dashboard statistics"""
    
    @staticmethod
    def get_dashboard_stats(db: Session) -> Dict[str, Any]:
        """
        Get overall dashboard statistics
        """
        today = datetime.utcnow().date()
        
        # User stats
        total_users = db.query(User).count()
        active_users_today = db.query(User).filter(
            func.date(User.last_login) == today
        ).count()
        
        # Post stats
        total_posts = db.query(Post).count()
        posts_today = db.query(Post).filter(
            func.date(Post.created_at) == today
        ).count()
        
        # Session stats
        total_sessions = db.query(ChatSession).count()
        sessions_today = db.query(ChatSession).filter(
            func.date(ChatSession.created_at) == today
        ).count()
        
        # Report stats
        pending_reports = db.query(Report).filter(
            Report.status == 'pending'
        ).count()
        
        return {
            "total_users": total_users,
            "active_users_today": active_users_today,
            "total_posts": total_posts,
            "posts_today": posts_today,
            "total_sessions": total_sessions,
            "sessions_today": sessions_today,
            "pending_reports": pending_reports,
        }