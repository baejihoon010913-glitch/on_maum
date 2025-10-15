from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime

from app.models.notification import Notification
from app.models.user import User


class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        return notification
    
    @staticmethod
    def create_empathy_notification(
        db: Session,
        post_author_id: str,
        empathizer_nickname: str,
        post_title: str,
        post_id: str
    ) -> Optional[Notification]:
        """Create notification for post empathy"""
        # Don't notify users of their own empathy
        return NotificationService.create_notification(
            db=db,
            user_id=post_author_id,
            notification_type="post_empathy",
            title="공감을 받았습니다",
            message=f"'{post_title}' 글에 새로운 공감이 달렸습니다.",
            data={
                "post_id": post_id,
                "post_title": post_title,
                "empathizer": empathizer_nickname
            }
        )
    
    @staticmethod 
    def create_counselor_reply_notification(
        db: Session,
        post_author_id: str,
        counselor_name: str,
        post_title: str,
        post_id: str
    ) -> Notification:
        """Create notification for counselor reply"""
        return NotificationService.create_notification(
            db=db,
            user_id=post_author_id,
            notification_type="counselor_reply",
            title="상담사 답변",
            message=f"'{post_title}' 글에 {counselor_name} 상담사가 답변을 달았습니다.",
            data={
                "post_id": post_id,
                "post_title": post_title,
                "counselor_name": counselor_name
            }
        )
    
    @staticmethod
    def create_emoji_reaction_notification(
        db: Session,
        post_author_id: str,
        reactor_nickname: str,
        post_title: str,
        post_id: str,
        emoji: str
    ) -> Optional[Notification]:
        """Create notification for emoji reaction"""
        return NotificationService.create_notification(
            db=db,
            user_id=post_author_id,
            notification_type="emoji_reaction",
            title="이모지 반응",
            message=f"'{post_title}' 글에 {emoji} 반응을 받았습니다.",
            data={
                "post_id": post_id,
                "post_title": post_title,
                "reactor": reactor_nickname,
                "emoji": emoji
            }
        )