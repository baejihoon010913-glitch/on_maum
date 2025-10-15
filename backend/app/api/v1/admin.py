"""
Admin API endpoints - Platform administration (Admins Only)
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.rbac import (
    get_staff_from_token, require_role, require_permission,
    StaffRole, Permission, audit_log
)
from app.models.staff import Staff
from app.models.user import User
from app.models.post import Post
from app.models.chat_session import ChatSession
from app.models.report import Report
from app.models.audit_log import AuditLog, AuditAction, AuditSeverity
from app.schemas.staff import (
    StaffCreate, StaffUpdate, StaffRoleUpdate, AuditLogResponse,
    DashboardStats, UserStatsResponse, SessionStatsResponse, PostStatsResponse
)
from app.services.staff_service import StaffService, AuditLogService, DashboardService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/system-stats")
async def get_system_stats(
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get system statistics dashboard (Admin permission required)
    """
    stats = DashboardService.get_dashboard_stats(db)
    
    # Add system health check
    stats["system_health"] = "healthy"  # Would implement actual health checks
    stats["last_updated"] = datetime.utcnow()
    
    return stats


@router.get("/pending-applications")
async def get_pending_applications(
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get pending counselor applications (Admin permission required)
    """
    # For now, return staff that are not approved
    pending_staff = db.query(Staff).filter(
        and_(
            Staff.role == "counselor",
            Staff.is_approved == False
        )
    ).all()
    
    applications = []
    for staff in pending_staff:
        applications.append({
            "application_id": str(staff.id),
            "applicant_name": staff.name,
            "email": staff.email,
            "phone": staff.phone,
            "license_number": "N/A",  # Would need to get from profile
            "specialties": [],        # Would need to get from profile
            "experience_years": 0,    # Would need to get from profile
            "education": "N/A",       # Would need to get from profile
            "introduction": "N/A",    # Would need to get from profile
            "documents": [],          # Would need to implement file storage
            "applied_at": staff.created_at,
            "status": "pending"
        })
    
    return applications


@router.post("/applications/{application_id}/approve")
@audit_log(AuditAction.STAFF_CREATE, target_type="staff", severity=AuditSeverity.HIGH)
async def approve_counselor_application(
    application_id: str,
    approval_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Approve counselor application (Admin permission required)
    """
    staff = db.query(Staff).filter(Staff.id == application_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if staff.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application already approved"
        )
    
    # Approve the staff
    staff.is_approved = True
    staff.is_active = True
    
    # Update department if provided
    if "department" in approval_data:
        staff.department = approval_data["department"]
    
    db.commit()
    
    return {
        "success": True,
        "message": "Counselor application has been approved.",
        "staff_id": str(staff.id),
        "login_credentials": {
            "email": staff.email,
            "temporary_password": "Please reset password"
        },
        "processed_at": datetime.utcnow(),
        "processed_by": str(current_staff.id)
    }


@router.post("/applications/{application_id}/reject")
@audit_log(AuditAction.STAFF_DELETE, target_type="staff", severity=AuditSeverity.HIGH)
async def reject_counselor_application(
    application_id: str,
    rejection_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Reject counselor application (Admin permission required)
    """
    staff = db.query(Staff).filter(Staff.id == application_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Delete the staff record (or mark as rejected)
    reason = rejection_data.get("reason", "Application rejected")
    
    # Store rejection info before deletion
    rejection_info = {
        "staff_id": str(staff.id),
        "name": staff.name,
        "email": staff.email,
        "reason": reason
    }
    
    db.delete(staff)
    db.commit()
    
    return {
        "success": True,
        "message": "Counselor application has been rejected.",
        "rejection_reason": reason,
        "processed_at": datetime.utcnow(),
        "processed_by": str(current_staff.id)
    }


@router.get("/users")
async def get_users_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^(active|suspended|banned)$"),
    search: Optional[str] = Query(None),
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get users list with filtering (Admin permission required)
    """
    query = db.query(User)
    
    # Apply filters
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "suspended":
        query = query.filter(User.is_active == False)  # Simplified for now
    elif status == "banned":
        query = query.filter(User.is_active == False)  # Would need separate ban status
    
    if search:
        query = query.filter(
            or_(
                User.nickname.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    users = query.offset(skip).limit(limit).all()
    
    users_list = []
    for user in users:
        # Get user activity stats
        post_count = db.query(Post).filter(Post.user_id == user.id).count()
        session_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
        
        users_list.append({
            "user_id": str(user.id),
            "nickname": user.nickname,
            "email": user.email,
            "sns_provider": "naver",  # Would need to store this
            "birth_year": user.birth_year,
            "gender": user.gender,
            "status": "active" if user.is_active else "suspended",
            "is_active": user.is_active,
            "created_at": user.created_at,
            "last_login": user.last_login,
            "activity_stats": {
                "total_sessions": session_count,
                "total_posts": post_count,
                "total_diaries": 0,  # Would need to count
                "empathy_given": 0,  # Would need to count
                "empathy_received": 0  # Would need to count
            },
            "moderation_info": {
                "report_count": 0,  # Would need to count reports against user
                "suspension_count": 0,
                "ban_count": 0,
                "last_moderation": None
            }
        })
    
    return users_list


@router.post("/users/{user_id}/suspend")
@audit_log(AuditAction.USER_DEACTIVATE, target_type="user", severity=AuditSeverity.HIGH)
async def suspend_user(
    user_id: str,
    suspension_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Suspend user (Admin permission required)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    reason = suspension_data.get("reason", "Policy violation")
    notes = suspension_data.get("notes", "")
    
    # Suspend user
    user.is_active = False
    db.commit()
    
    return {
        "success": True,
        "message": "User has been suspended.",
        "user_id": user_id,
        "action": "suspended",
        "duration": "7 days",  # Would implement configurable duration
        "reason": reason,
        "suspended_until": datetime.utcnow() + timedelta(days=7),
        "processed_by": str(current_staff.id)
    }


@router.post("/users/{user_id}/ban")
@audit_log(AuditAction.USER_DELETE, target_type="user", severity=AuditSeverity.CRITICAL)
async def ban_user_permanently(
    user_id: str,
    ban_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Ban user permanently (Admin permission required)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    reason = ban_data.get("reason", "Serious rule violations")
    notes = ban_data.get("notes", "")
    
    # Ban user (deactivate for now, could add ban status field)
    user.is_active = False
    db.commit()
    
    return {
        "success": True,
        "message": "User has been permanently banned.",
        "user_id": user_id,
        "action": "banned",
        "reason": reason,
        "banned_at": datetime.utcnow(),
        "processed_by": str(current_staff.id)
    }


@router.get("/contents")
async def get_contents_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None, regex="^(post|diary|comment)$"),
    status: Optional[str] = Query(None, regex="^(active|reported|hidden|deleted)$"),
    search: Optional[str] = Query(None),
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get contents list with filtering (Admin permission required)
    """
    # For now, only handle posts
    if type is None or type == "post":
        query = db.query(Post)
        
        if status == "reported":
            # Get posts that have reports
            reported_post_ids = db.query(Report.post_id).filter(
                Report.status == "pending"
            ).distinct().subquery()
            query = query.filter(Post.id.in_(reported_post_ids))
        
        if search:
            query = query.filter(
                or_(
                    Post.title.ilike(f"%{search}%"),
                    Post.content.ilike(f"%{search}%")
                )
            )
        
        posts = query.offset(skip).limit(limit).all()
        
        contents = []
        for post in posts:
            # Get report count
            report_count = db.query(Report).filter(Report.post_id == post.id).count()
            
            contents.append({
                "content_id": str(post.id),
                "type": "post",
                "title": post.title,
                "content": post.content[:200] + "..." if len(post.content) > 200 else post.content,
                "author": {
                    "user_id": str(post.user_id),
                    "nickname": "Anonymous User"  # Keep anonymous
                },
                "category": post.category,
                "status": "reported" if report_count > 0 else "active",
                "created_at": post.created_at,
                "updated_at": post.updated_at,
                "moderation_info": {
                    "report_count": report_count,
                    "last_reported_at": None,  # Would need to get from reports
                    "report_reasons": [],      # Would need to aggregate
                    "moderation_status": "pending_review" if report_count > 0 else "none"
                },
                "engagement": {
                    "view_count": post.view_count,
                    "empathy_count": post.empathy_count,
                    "comment_count": 0  # Would need to count counselor replies
                }
            })
        
        return contents
    
    return []


@router.post("/contents/{content_id}/hide")
@audit_log(AuditAction.POST_HIDE, target_type="post", severity=AuditSeverity.MEDIUM)
async def hide_content(
    content_id: str,
    hide_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Hide content (Admin permission required)
    """
    post = db.query(Post).filter(Post.id == content_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    reason = hide_data.get("reason", "Inappropriate content")
    notes = hide_data.get("notes", "")
    
    # For now, just mark as private (would need proper hidden status)
    post.is_private = True
    db.commit()
    
    return {
        "success": True,
        "message": "Content has been hidden.",
        "content_id": content_id,
        "action": "hidden",
        "reason": reason,
        "processed_at": datetime.utcnow(),
        "processed_by": str(current_staff.id)
    }


@router.get("/platform-stats")
async def get_platform_stats(
    period: str = Query("month", regex="^(week|month|year)$"),
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get platform statistics (Admin permission required)
    """
    now = datetime.utcnow()
    
    if period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)
    
    # User stats
    total_users = db.query(User).count()
    new_users = db.query(User).filter(User.created_at >= start_date).count()
    active_users = db.query(User).filter(
        and_(
            User.last_login >= start_date,
            User.is_active == True
        )
    ).count()
    
    # Content stats
    total_posts = db.query(Post).count()
    new_posts = db.query(Post).filter(Post.created_at >= start_date).count()
    
    # Session stats
    total_sessions = db.query(ChatSession).count()
    new_sessions = db.query(ChatSession).filter(ChatSession.created_at >= start_date).count()
    
    return {
        "period": period,
        "date_range": {
            "start": start_date.isoformat(),
            "end": now.isoformat()
        },
        "user_stats": {
            "total_users": total_users,
            "new_users": new_users,
            "active_users": active_users,
            "retention_rate": round(active_users / total_users * 100, 2) if total_users > 0 else 0
        },
        "content_stats": {
            "total_posts": total_posts,
            "new_posts": new_posts,
            "public_posts": db.query(Post).filter(Post.is_private == False).count(),
            "private_posts": db.query(Post).filter(Post.is_private == True).count()
        },
        "session_stats": {
            "total_sessions": total_sessions,
            "new_sessions": new_sessions,
            "completed_sessions": db.query(ChatSession).filter(ChatSession.status == "completed").count(),
            "cancelled_sessions": db.query(ChatSession).filter(ChatSession.status == "cancelled").count()
        },
        "system_stats": {
            "total_staff": db.query(Staff).filter(Staff.is_active == True).count(),
            "active_counselors": db.query(Staff).filter(
                and_(
                    Staff.role == "counselor",
                    Staff.is_active == True,
                    Staff.is_approved == True
                )
            ).count(),
            "pending_reports": db.query(Report).filter(Report.status == "pending").count()
        }
    }


# Staff management endpoints (Admin only)
@router.get("/staff", response_model=List[Dict[str, Any]])
async def get_staff_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get staff list (Admin permission required)
    """
    staff_list = StaffService.get_all_staff(
        db, skip=skip, limit=limit, role=role, department=department
    )
    
    return [
        {
            "id": str(staff.id),
            "name": staff.name,
            "email": staff.email,
            "phone": staff.phone,
            "role": staff.role,
            "department": staff.department,
            "is_active": staff.is_active,
            "is_approved": staff.is_approved,
            "created_at": staff.created_at,
            "last_login": staff.last_login,
        }
        for staff in staff_list
    ]


@router.post("/staff", response_model=Dict[str, Any])
@audit_log(AuditAction.STAFF_CREATE, target_type="staff", severity=AuditSeverity.HIGH)
async def create_staff_member(
    staff_data: StaffCreate,
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Create new staff member (Admin permission required)
    """
    try:
        new_staff = StaffService.create_staff(db, staff_data, current_staff)
        return {
            "success": True,
            "message": "Staff member created successfully",
            "staff_id": str(new_staff.id),
            "staff": {
                "id": str(new_staff.id),
                "name": new_staff.name,
                "email": new_staff.email,
                "role": new_staff.role,
                "department": new_staff.department,
                "is_active": new_staff.is_active,
                "created_at": new_staff.created_at,
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/staff/{staff_id}")
@audit_log(AuditAction.STAFF_UPDATE, target_type="staff", severity=AuditSeverity.MEDIUM)
async def update_staff_member(
    staff_id: str,
    staff_data: StaffUpdate,
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Update staff member (Admin permission required)
    """
    updated_staff = StaffService.update_staff(db, staff_id, staff_data, current_staff)
    if not updated_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    return {
        "success": True,
        "message": "Staff member updated successfully",
        "staff": {
            "id": str(updated_staff.id),
            "name": updated_staff.name,
            "email": updated_staff.email,
            "role": updated_staff.role,
            "department": updated_staff.department,
            "is_active": updated_staff.is_active,
            "updated_at": updated_staff.updated_at,
        }
    }


@router.put("/staff/{staff_id}/role")
@audit_log(AuditAction.STAFF_ROLE_CHANGE, target_type="staff", severity=AuditSeverity.HIGH)
async def update_staff_role(
    staff_id: str,
    role_data: StaffRoleUpdate,
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Update staff role (Admin permission required)
    """
    updated_staff = StaffService.update_staff_role(db, staff_id, role_data, current_staff)
    if not updated_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    return {
        "success": True,
        "message": f"Staff role updated to {role_data.role.value}",
        "staff": {
            "id": str(updated_staff.id),
            "name": updated_staff.name,
            "role": updated_staff.role,
        }
    }


@router.delete("/staff/{staff_id}")
@audit_log(AuditAction.STAFF_DELETE, target_type="staff", severity=AuditSeverity.HIGH)
async def deactivate_staff_member(
    staff_id: str,
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Deactivate staff member (Admin permission required)
    """
    deactivated_staff = StaffService.deactivate_staff(db, staff_id, current_staff)
    if not deactivated_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    return {
        "success": True,
        "message": "Staff member deactivated successfully"
    }


# Audit logs
@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    staff_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    current_staff: Staff = Depends(require_role(StaffRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get audit logs (Admin permission required)
    """
    logs = AuditLogService.get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        staff_id=staff_id,
        action=action,
        severity=severity,
        target_type=target_type
    )
    
    return [AuditLogResponse.model_validate(log) for log in logs]