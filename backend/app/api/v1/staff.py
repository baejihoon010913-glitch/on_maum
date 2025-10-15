"""
Staff API endpoints - Authentication and management for counselors and staff
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.core.rbac import (
    get_staff_from_token, require_role, require_permission,
    StaffRole, Permission, audit_log
)
from app.models.staff import Staff
from app.models.audit_log import AuditAction, AuditSeverity
from app.schemas.staff import (
    StaffLogin, StaffLoginResponse, StaffInfo, 
    StaffPasswordChange, DashboardStats
)
from app.services.staff_service import StaffService, AuditLogService, DashboardService
from app.services.counselor_service import CounselorService
from app.schemas.counselor import (
    CounselorProfileCreate, CounselorProfileResponse,
    CounselorScheduleCreate, CounselorUnavailabilityCreate
)

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/login", response_model=StaffLoginResponse)
@audit_log(AuditAction.STAFF_LOGIN, severity=AuditSeverity.LOW)
async def staff_login(
    request: Request,
    login_data: StaffLogin,
    db: Session = Depends(get_db),
):
    """
    Staff login endpoint
    """
    staff = StaffService.authenticate_staff(db, login_data.email, login_data.password)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    staff.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    tokens = StaffService.create_staff_tokens(staff)
    
    # Store staff in request state for audit logging
    request.state.staff = staff
    
    return StaffLoginResponse(
        **tokens,
        staff=StaffInfo.model_validate(staff)
    )


@router.get("/me", response_model=StaffInfo)
async def get_current_staff_info(
    current_staff: Staff = Depends(get_staff_from_token)
):
    """
    Get current staff member's information
    """
    return StaffInfo.model_validate(current_staff)


@router.post("/logout")
@audit_log(AuditAction.STAFF_LOGOUT, severity=AuditSeverity.LOW)
async def staff_logout(
    current_staff: Staff = Depends(get_staff_from_token),
    db: Session = Depends(get_db),
):
    """
    Staff logout endpoint
    """
    return {"message": "Successfully logged out"}


@router.post("/change-password")
@audit_log(AuditAction.STAFF_UPDATE, target_type="staff", severity=AuditSeverity.MEDIUM)
async def change_password(
    password_data: StaffPasswordChange,
    current_staff: Staff = Depends(get_staff_from_token),
    db: Session = Depends(get_db),
):
    """
    Change staff password
    """
    success = StaffService.change_password(
        db, 
        current_staff.id, 
        password_data.current_password, 
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    return {"message": "Password changed successfully"}


# Counselor-specific endpoints
@router.post("/counselor/profile", response_model=CounselorProfileResponse)
@audit_log(AuditAction.STAFF_UPDATE, target_type="counselor_profile", severity=AuditSeverity.MEDIUM)
async def create_counselor_profile(
    profile_data: CounselorProfileCreate,
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Create counselor profile (Counselor permission required)
    """
    # Check if profile already exists
    existing_profile = db.query(CounselorProfile).filter(
        CounselorProfile.staff_id == current_staff.id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Counselor profile already exists"
        )
    
    profile = CounselorService.create_counselor_profile(
        db, current_staff.id, profile_data
    )
    
    return CounselorProfileResponse.model_validate(profile)


@router.get("/counselor/dashboard", response_model=Dict[str, Any])
async def get_counselor_dashboard(
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Get counselor dashboard data (Counselor permission required)
    """
    from app.models.chat_session import ChatSession
    from app.models.message import Message
    from app.models.post import Post
    from sqlalchemy import func, and_
    
    today = datetime.utcnow().date()
    
    # Get today's sessions
    today_sessions = db.query(ChatSession).filter(
        and_(
            ChatSession.counselor_id == str(current_staff.id),
            func.date(ChatSession.scheduled_date) == today
        )
    ).all()
    
    # Count by status
    total_sessions = len(today_sessions)
    completed_sessions = len([s for s in today_sessions if s.status == 'completed'])
    pending_sessions = len([s for s in today_sessions if s.status == 'pending'])
    cancelled_sessions = len([s for s in today_sessions if s.status == 'cancelled'])
    
    # Get active chat sessions
    active_sessions = db.query(ChatSession).filter(
        and_(
            ChatSession.counselor_id == str(current_staff.id),
            ChatSession.status == 'active'
        )
    ).all()
    
    active_chat_sessions = []
    for session in active_sessions:
        # Get last message time
        last_message = db.query(Message).filter(
            Message.session_id == session.id
        ).order_by(Message.created_at.desc()).first()
        
        # Get unread messages count (messages after counselor's last message)
        unread_count = 0
        if last_message:
            counselor_messages = db.query(Message).filter(
                and_(
                    Message.session_id == session.id,
                    Message.sender_type == 'counselor',
                    Message.sender_id == str(current_staff.id)
                )
            ).order_by(Message.created_at.desc()).first()
            
            if counselor_messages:
                unread_count = db.query(Message).filter(
                    and_(
                        Message.session_id == session.id,
                        Message.sender_type == 'user',
                        Message.created_at > counselor_messages.created_at
                    )
                ).count()
        
        active_chat_sessions.append({
            "session_id": str(session.id),
            "user_nickname": "Anonymous User",  # Keep anonymous
            "category": session.category,
            "started_at": session.actual_start_time,
            "last_message_at": last_message.created_at if last_message else None,
            "unread_messages": unread_count
        })
    
    # Get recent public posts that might need counselor response
    recent_posts = db.query(Post).filter(
        and_(
            Post.is_private == False,
            Post.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
        )
    ).order_by(Post.created_at.desc()).limit(10).all()
    
    pending_posts = []
    for post in recent_posts:
        # Check if counselor has already replied
        from app.models.counselor_reply import CounselorReply
        existing_reply = db.query(CounselorReply).filter(
            and_(
                CounselorReply.post_id == post.id,
                CounselorReply.staff_id == current_staff.id
            )
        ).first()
        
        if not existing_reply:
            urgency = "low"
            if "help" in post.content.lower() or "urgent" in post.content.lower():
                urgency = "high"
            elif "problem" in post.content.lower() or "issue" in post.content.lower():
                urgency = "medium"
            
            pending_posts.append({
                "post_id": str(post.id),
                "title": post.title,
                "category": post.category,
                "created_at": post.created_at,
                "urgency": urgency,
                "view_count": post.view_count
            })
    
    return {
        "today_stats": {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "pending_sessions": pending_sessions,
            "cancelled_sessions": cancelled_sessions,
            "total_messages": 0,  # Would need to calculate
            "new_posts": len(recent_posts)
        },
        "active_chat_sessions": active_chat_sessions,
        "pending_posts": pending_posts,
        "notifications": [
            "Personal information collection is prohibited during teen counseling.",
            "Please report crisis situations to administrators immediately."
        ]
    }


@router.post("/counselor/sessions/{session_id}/action")
@audit_log(AuditAction.SESSION_UPDATE, target_type="chat_session", severity=AuditSeverity.MEDIUM)
async def handle_session_action(
    session_id: str,
    action_data: Dict[str, Any],
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Accept or reject session request (Counselor permission required)
    """
    from app.models.chat_session import ChatSession
    
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session.counselor_id != str(current_staff.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this session"
        )
    
    action = action_data.get("action")
    if action == "accept":
        session.status = "confirmed"
        message = "Counseling request has been accepted."
    elif action == "reject":
        session.status = "cancelled"
        if "reason" in action_data:
            session.cancel_reason = action_data["reason"]
        message = "Counseling request has been rejected."
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'accept' or 'reject'"
        )
    
    db.commit()
    
    return {
        "session_id": session_id,
        "action": action,
        "status": session.status,
        "message": message
    }


@router.post("/counselor/replies")
@audit_log(AuditAction.STAFF_POST_REPLY, target_type="counselor_reply", severity=AuditSeverity.LOW)
async def create_counselor_reply(
    reply_data: Dict[str, str],
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Write counselor reply to post (Counselor permission required)
    """
    from app.models.counselor_reply import CounselorReply
    from app.models.post import Post
    
    post_id = reply_data.get("post_id")
    content = reply_data.get("content")
    
    if not post_id or not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="post_id and content are required"
        )
    
    # Check if post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if counselor already replied to this post
    existing_reply = db.query(CounselorReply).filter(
        and_(
            CounselorReply.post_id == post_id,
            CounselorReply.staff_id == current_staff.id
        )
    ).first()
    
    if existing_reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already replied to this post"
        )
    
    # Create reply
    reply = CounselorReply(
        post_id=post_id,
        staff_id=current_staff.id,
        content=content,
        is_approved=True,  # Auto-approve for now
    )
    
    db.add(reply)
    db.commit()
    db.refresh(reply)
    
    return {
        "id": str(reply.id),
        "post_id": post_id,
        "staff_id": str(current_staff.id),
        "content": content,
        "is_approved": True,
        "created_at": reply.created_at,
        "counselor_name": current_staff.name
    }


@router.post("/counselor/schedules/recurring")
@audit_log(AuditAction.STAFF_UPDATE, target_type="counselor_schedule", severity=AuditSeverity.MEDIUM)
async def create_recurring_schedule(
    schedule_data: CounselorScheduleCreate,
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Create recurring counselor schedule (Counselor permission required)
    """
    schedule = CounselorService.create_counselor_schedule(
        db, current_staff.id, schedule_data
    )
    return {"message": "Recurring schedule created successfully", "schedule_id": str(schedule.id)}


@router.post("/counselor/schedules/unavailable")
@audit_log(AuditAction.STAFF_UPDATE, target_type="counselor_unavailable", severity=AuditSeverity.MEDIUM)
async def set_unavailable_time(
    unavailable_data: CounselorUnavailabilityCreate,
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Set counselor unavailable time (Counselor permission required)
    """
    unavailable = CounselorService.create_counselor_unavailability(
        db, current_staff.id, unavailable_data
    )
    return {"message": "Unavailable time set successfully", "unavailable_id": str(unavailable.id)}


@router.get("/counselor/sessions/{session_id}/user-history")
async def get_user_history_for_session(
    session_id: str,
    current_staff: Staff = Depends(require_role(StaffRole.COUNSELOR)),
    db: Session = Depends(get_db),
):
    """
    Get user history for counseling session (Consent-based, Counselor permission required)
    """
    from app.models.chat_session import ChatSession
    from app.models.user_consent import UserConsent
    from app.models.user import User
    
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session.counselor_id != str(current_staff.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    # Check user consent
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check for counselor history access consent
    consent = db.query(UserConsent).filter(
        and_(
            UserConsent.user_id == user.id,
            UserConsent.consent_type == "counselor_history_access",
            UserConsent.consent_granted == True,
            UserConsent.expires_at > datetime.utcnow()
        )
    ).first()
    
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has not consented to counseling history access.",
            headers={"consent_required": "true", "consent_url": "/api/auth/me/consent"}
        )
    
    # Return anonymized user history
    return {
        "session_id": session_id,
        "user_id": f"ANONYMIZED-USER-{session_id[-8:]}",
        "consent_status": True,
        "consent_date": consent.granted_at,
        "past_session_summary": [],  # Would need to implement
        "recent_public_posts": [],   # Would need to implement
        "mood_trends": {
            "last_30_days": ["neutral"],
            "most_frequent_mood": "neutral",
            "improvement_trend": "stable"
        },
        "privacy_info": {
            "data_anonymized": True,
            "sensitive_data_excluded": True,
            "access_expires_at": consent.expires_at
        }
    }