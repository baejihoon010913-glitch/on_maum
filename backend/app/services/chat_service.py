from typing import List, Optional, Tuple
from datetime import date, time, datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc

from app.models.chat_session import ChatSession
from app.models.message import Message
from app.models.user import User
from app.models.staff import Staff
from app.models.time_slot import TimeSlot
from app.schemas.chat import ChatSessionCreate, MessageCreate
from app.services.counselor_service import CounselorService
from app.services.notification_service import NotificationService


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.counselor_service = CounselorService(db)
        self.notification_service = NotificationService(db)

    def get_user_chat_sessions(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        status: Optional[str] = None
    ) -> Tuple[List[ChatSession], int]:
        """
        Get chat sessions for a user with optional status filter.
        """
        query = (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .options(
                joinedload(ChatSession.counselor).joinedload(Staff.counselor_profile),
                joinedload(ChatSession.time_slot)
            )
        )

        if status:
            query = query.filter(ChatSession.status == status)

        # Order by scheduled date/time desc
        query = query.order_by(
            desc(ChatSession.scheduled_date),
            desc(ChatSession.scheduled_start_time)
        )

        total = query.count()
        sessions = query.offset(skip).limit(limit).all()

        return sessions, total

    def get_counselor_chat_sessions(
        self,
        counselor_id: str,
        skip: int = 0,
        limit: int = 10,
        status: Optional[str] = None
    ) -> Tuple[List[ChatSession], int]:
        """
        Get chat sessions for a counselor with optional status filter.
        """
        query = (
            self.db.query(ChatSession)
            .filter(ChatSession.counselor_id == counselor_id)
            .options(
                joinedload(ChatSession.user),
                joinedload(ChatSession.time_slot)
            )
        )

        if status:
            query = query.filter(ChatSession.status == status)

        # Order by scheduled date/time desc
        query = query.order_by(
            desc(ChatSession.scheduled_date),
            desc(ChatSession.scheduled_start_time)
        )

        total = query.count()
        sessions = query.offset(skip).limit(limit).all()

        return sessions, total

    def book_chat_session(
        self,
        user_id: str,
        session_data: ChatSessionCreate
    ) -> ChatSession:
        """
        Book a new chat session with a counselor.
        """
        # Verify counselor exists and is available
        counselor = self.counselor_service.get_counselor_by_id(session_data.counselor_id)
        if not counselor:
            raise ValueError("Counselor not found")

        if not counselor.counselor_profile.is_available:
            raise ValueError("Counselor is not available")

        # If time_slot_id is provided, verify and book the slot
        time_slot = None
        if session_data.time_slot_id:
            time_slot = (
                self.db.query(TimeSlot)
                .filter(
                    TimeSlot.id == session_data.time_slot_id,
                    TimeSlot.counselor_id == session_data.counselor_id,
                    TimeSlot.is_available == True,
                    TimeSlot.is_booked == False
                )
                .first()
            )

            if not time_slot:
                raise ValueError("Time slot not available")

            # Verify the scheduled time matches the slot
            if (time_slot.date != session_data.scheduled_date or
                time_slot.start_time != session_data.start_time or
                time_slot.end_time != session_data.end_time):
                raise ValueError("Scheduled time does not match time slot")

        # Create the chat session
        chat_session = ChatSession(
            user_id=user_id,
            counselor_id=session_data.counselor_id,
            time_slot_id=session_data.time_slot_id,
            status="pending",
            scheduled_date=session_data.scheduled_date,
            scheduled_start_time=session_data.start_time,
            scheduled_end_time=session_data.end_time,
            category=session_data.concern_category,
            description=session_data.description,
            created_at=datetime.utcnow()
        )

        self.db.add(chat_session)
        self.db.flush()  # Get the ID without committing

        # Book the time slot if provided
        if time_slot:
            try:
                self.counselor_service.book_time_slot(
                    slot_id=str(time_slot.id),
                    session_id=str(chat_session.id)
                )
            except Exception as e:
                self.db.rollback()
                raise ValueError(f"Failed to book time slot: {e}")

        # Create booking confirmation notifications
        try:
            # Notification to user
            self.notification_service.create_session_booking_notification(
                user_id=user_id,
                session_id=str(chat_session.id),
                counselor_name=counselor.name,
                scheduled_datetime=datetime.combine(
                    session_data.scheduled_date,
                    session_data.start_time
                )
            )

            # Notification to counselor (if they have user account)
            # This would typically be handled by a separate staff notification system
            
        except Exception as e:
            # Don't fail the booking if notification fails
            print(f"Failed to create booking notifications: {e}")

        self.db.commit()
        self.db.refresh(chat_session)

        return chat_session

    def get_chat_session_details(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        counselor_id: Optional[str] = None
    ) -> Optional[ChatSession]:
        """
        Get detailed information about a chat session.
        Only accessible by participants.
        """
        query = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id)
            .options(
                joinedload(ChatSession.user),
                joinedload(ChatSession.counselor).joinedload(Staff.counselor_profile),
                joinedload(ChatSession.time_slot)
            )
        )

        session = query.first()

        if not session:
            return None

        # Check access permissions
        if user_id and str(session.user_id) != user_id:
            return None

        if counselor_id and str(session.counselor_id) != counselor_id:
            return None

        # If neither user_id nor counselor_id provided, deny access
        if not user_id and not counselor_id:
            return None

        return session

    def cancel_chat_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        counselor_id: Optional[str] = None,
        cancel_reason: Optional[str] = None
    ) -> ChatSession:
        """
        Cancel a chat session.
        """
        session = self.get_chat_session_details(
            session_id=session_id,
            user_id=user_id,
            counselor_id=counselor_id
        )

        if not session:
            raise ValueError("Session not found or access denied")

        if session.status in ["completed", "cancelled"]:
            raise ValueError(f"Cannot cancel session with status: {session.status}")

        # Update session status
        session.status = "cancelled"
        session.updated_at = datetime.utcnow()

        # Add cancellation note if reason provided
        if cancel_reason:
            if session.counselor_notes:
                session.counselor_notes += f"\n\nCancellation reason: {cancel_reason}"
            else:
                session.counselor_notes = f"Cancellation reason: {cancel_reason}"

        # Unbook the time slot if it exists
        if session.time_slot_id:
            try:
                self.counselor_service.cancel_time_slot_booking(str(session.time_slot_id))
            except Exception as e:
                print(f"Failed to unbook time slot: {e}")

        # Create cancellation notifications
        try:
            cancelled_by = "user" if user_id else "counselor"
            self.notification_service.create_session_cancellation_notification(
                session=session,
                cancelled_by=cancelled_by,
                reason=cancel_reason
            )
        except Exception as e:
            print(f"Failed to create cancellation notifications: {e}")

        self.db.commit()
        self.db.refresh(session)

        return session

    def start_chat_session(
        self,
        session_id: str,
        counselor_id: str
    ) -> ChatSession:
        """
        Mark a chat session as started (active).
        Only counselors can start sessions.
        """
        session = self.get_chat_session_details(
            session_id=session_id,
            counselor_id=counselor_id
        )

        if not session:
            raise ValueError("Session not found or access denied")

        if session.status != "pending":
            raise ValueError(f"Cannot start session with status: {session.status}")

        # Update session
        session.status = "active"
        session.actual_start_time = datetime.utcnow()
        session.updated_at = datetime.utcnow()

        # Create session start notification for user
        try:
            self.notification_service.create_session_start_notification(
                user_id=str(session.user_id),
                session_id=session_id,
                counselor_name=session.counselor.name
            )
        except Exception as e:
            print(f"Failed to create session start notification: {e}")

        self.db.commit()
        self.db.refresh(session)

        return session

    def complete_chat_session(
        self,
        session_id: str,
        counselor_id: str,
        counselor_notes: Optional[str] = None
    ) -> ChatSession:
        """
        Mark a chat session as completed.
        Only counselors can complete sessions.
        """
        session = self.get_chat_session_details(
            session_id=session_id,
            counselor_id=counselor_id
        )

        if not session:
            raise ValueError("Session not found or access denied")

        if session.status != "active":
            raise ValueError(f"Cannot complete session with status: {session.status}")

        # Calculate duration
        if session.actual_start_time:
            duration = datetime.utcnow() - session.actual_start_time
            session.duration = int(duration.total_seconds() / 60)  # in minutes

        # Update session
        session.status = "completed"
        session.actual_end_time = datetime.utcnow()
        session.updated_at = datetime.utcnow()

        if counselor_notes:
            session.counselor_notes = counselor_notes

        # Update counselor session count
        counselor_profile = session.counselor.counselor_profile
        counselor_profile.total_sessions += 1

        # Create session completion notification for user
        try:
            self.notification_service.create_session_completion_notification(
                user_id=str(session.user_id),
                session_id=session_id,
                counselor_name=session.counselor.name
            )
        except Exception as e:
            print(f"Failed to create session completion notification: {e}")

        self.db.commit()
        self.db.refresh(session)

        return session

    def get_session_messages(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        counselor_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Message]:
        """
        Get messages for a chat session.
        Only accessible by session participants.
        """
        # Verify access to session
        session = self.get_chat_session_details(
            session_id=session_id,
            user_id=user_id,
            counselor_id=counselor_id
        )

        if not session:
            raise ValueError("Session not found or access denied")

        messages = (
            self.db.query(Message)
            .filter(Message.session_id == session_id)
            .order_by(Message.created_at)
            .offset(skip)
            .limit(limit)
            .all()
        )

        return messages

    def send_message(
        self,
        session_id: str,
        sender_id: str,
        sender_type: str,  # "user" or "counselor"
        message_data: MessageCreate
    ) -> Message:
        """
        Send a message in a chat session.
        """
        # Verify session exists and sender has access
        if sender_type == "user":
            session = self.get_chat_session_details(
                session_id=session_id,
                user_id=sender_id
            )
        else:  # counselor
            session = self.get_chat_session_details(
                session_id=session_id,
                counselor_id=sender_id
            )

        if not session:
            raise ValueError("Session not found or access denied")

        if session.status not in ["active", "pending"]:
            raise ValueError(f"Cannot send message to session with status: {session.status}")

        # Create message
        message = Message(
            session_id=session_id,
            sender_id=sender_id,
            sender_type=sender_type,
            content=message_data.content,
            created_at=datetime.utcnow()
        )

        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        return message