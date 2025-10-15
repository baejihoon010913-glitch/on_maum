"""
Role-Based Access Control (RBAC) system for OnMaum platform
Provides decorators and dependencies for managing staff and admin permissions
"""

from functools import wraps
from typing import List, Optional, Callable, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import enum

from app.core.security import ALGORITHM, SECRET_KEY
from app.core.database import get_db
from app.models.staff import Staff
from app.models.audit_log import AuditLog, AuditAction, AuditSeverity


class StaffRole(enum.Enum):
    """Staff role enumeration"""
    ADMIN = "admin"
    COUNSELOR = "counselor"
    MODERATOR = "moderator"
    SUPPORT = "support"


class Permission(enum.Enum):
    """Permission enumeration for RBAC"""
    # User management
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    
    # Post management
    POST_READ = "post:read"
    POST_WRITE = "post:write"
    POST_DELETE = "post:delete"
    POST_MODERATE = "post:moderate"
    
    # Session management
    SESSION_READ = "session:read"
    SESSION_WRITE = "session:write"
    SESSION_DELETE = "session:delete"
    
    # Staff management
    STAFF_READ = "staff:read"
    STAFF_WRITE = "staff:write"
    STAFF_DELETE = "staff:delete"
    
    # System administration
    SYSTEM_CONFIG = "system:config"
    AUDIT_READ = "audit:read"
    BACKUP_MANAGE = "backup:manage"
    
    # Report management
    REPORT_READ = "report:read"
    REPORT_WRITE = "report:write"
    
    # Dashboard access
    DASHBOARD_STAFF = "dashboard:staff"
    DASHBOARD_ADMIN = "dashboard:admin"


# Role-Permission mapping
ROLE_PERMISSIONS = {
    StaffRole.ADMIN: [
        # Admin has all permissions
        Permission.USER_READ, Permission.USER_WRITE, Permission.USER_DELETE,
        Permission.POST_READ, Permission.POST_WRITE, Permission.POST_DELETE, Permission.POST_MODERATE,
        Permission.SESSION_READ, Permission.SESSION_WRITE, Permission.SESSION_DELETE,
        Permission.STAFF_READ, Permission.STAFF_WRITE, Permission.STAFF_DELETE,
        Permission.SYSTEM_CONFIG, Permission.AUDIT_READ, Permission.BACKUP_MANAGE,
        Permission.REPORT_READ, Permission.REPORT_WRITE,
        Permission.DASHBOARD_STAFF, Permission.DASHBOARD_ADMIN,
    ],
    
    StaffRole.COUNSELOR: [
        # Counselor permissions
        Permission.USER_READ,  # Can view user basic info during sessions
        Permission.POST_READ,  # Can read user posts with consent
        Permission.SESSION_READ, Permission.SESSION_WRITE,  # Manage own sessions
        Permission.DASHBOARD_STAFF,
    ],
    
    StaffRole.MODERATOR: [
        # Moderator permissions
        Permission.USER_READ,
        Permission.POST_READ, Permission.POST_MODERATE, Permission.POST_DELETE,
        Permission.SESSION_READ,
        Permission.REPORT_READ, Permission.REPORT_WRITE,
        Permission.DASHBOARD_STAFF,
    ],
    
    StaffRole.SUPPORT: [
        # Support staff permissions
        Permission.USER_READ,
        Permission.POST_READ,
        Permission.SESSION_READ,
        Permission.REPORT_READ,
        Permission.DASHBOARD_STAFF,
    ],
}


security = HTTPBearer()


class RBACError(Exception):
    """Custom exception for RBAC errors"""
    pass


def get_staff_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Staff:
    """
    Extract and validate staff information from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        staff_id: str = payload.get("sub")
        token_type: str = payload.get("type", "")
        
        if staff_id is None or token_type != "staff_access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.is_active == True).first()
    if staff is None:
        raise credentials_exception
    
    return staff


def require_role(*allowed_roles: StaffRole):
    """
    Dependency factory for role-based access control
    Usage: @router.get("/admin-only", dependencies=[Depends(require_role(StaffRole.ADMIN))])
    """
    def role_checker(staff: Staff = Depends(get_staff_from_token)) -> Staff:
        if StaffRole(staff.role) not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[role.value for role in allowed_roles]}"
            )
        return staff
    
    return role_checker


def require_permission(*required_permissions: Permission):
    """
    Dependency factory for permission-based access control
    Usage: @router.get("/users", dependencies=[Depends(require_permission(Permission.USER_READ))])
    """
    def permission_checker(staff: Staff = Depends(get_staff_from_token)) -> Staff:
        staff_role = StaffRole(staff.role)
        staff_permissions = ROLE_PERMISSIONS.get(staff_role, [])
        
        for permission in required_permissions:
            if permission not in staff_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required permission: {permission.value}"
                )
        
        return staff
    
    return permission_checker


def audit_log(
    action: AuditAction,
    target_type: Optional[str] = None,
    severity: AuditSeverity = AuditSeverity.MEDIUM,
    description: Optional[str] = None,
):
    """
    Decorator for automatic audit logging
    Usage: @audit_log(AuditAction.USER_DELETE, target_type="user", severity=AuditSeverity.HIGH)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract common dependencies
            request: Request = None
            staff: Staff = None
            db: Session = None
            
            # Find dependencies in kwargs (FastAPI dependency injection)
            for key, value in kwargs.items():
                if isinstance(value, Request):
                    request = value
                elif isinstance(value, Staff):
                    staff = value
                elif hasattr(value, 'query'):  # Session-like object
                    db = value
            
            # If no staff found in kwargs, try to get from request state
            if not staff and request:
                staff = getattr(request.state, 'staff', None)
            
            target_id = None
            target_name = None
            error_message = None
            success = "success"
            
            try:
                # Execute the original function
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                
                # Try to extract target information from result or kwargs
                if hasattr(result, 'id'):
                    target_id = str(result.id)
                elif 'id' in kwargs:
                    target_id = str(kwargs['id'])
                elif len(args) > 1:  # Usually the first arg after self is ID
                    target_id = str(args[1]) if args[1] else None
                
                return result
                
            except Exception as e:
                success = "failed"
                error_message = str(e)
                raise
            
            finally:
                # Log the action if we have the required information
                if staff and db:
                    log_entry = AuditLog.create_log(
                        staff_id=staff.id,
                        staff_name=staff.name,
                        staff_role=staff.role,
                        action=action,
                        action_description=description or f"{action.value} performed by {staff.name}",
                        severity=severity,
                        target_type=target_type,
                        target_id=target_id,
                        target_name=target_name,
                        ip_address=request.client.host if request else None,
                        user_agent=request.headers.get("User-Agent") if request else None,
                        success=success,
                        error_message=error_message,
                    )
                    
                    try:
                        db.add(log_entry)
                        db.commit()
                    except Exception as log_error:
                        # Don't fail the original operation due to logging errors
                        print(f"Failed to write audit log: {log_error}")
        
        return wrapper
    return decorator


def get_staff_permissions(staff: Staff) -> List[Permission]:
    """
    Get all permissions for a staff member based on their role
    """
    staff_role = StaffRole(staff.role)
    return ROLE_PERMISSIONS.get(staff_role, [])


def check_permission(staff: Staff, permission: Permission) -> bool:
    """
    Check if a staff member has a specific permission
    """
    staff_permissions = get_staff_permissions(staff)
    return permission in staff_permissions


# Import asyncio at the end to avoid circular imports
import asyncio