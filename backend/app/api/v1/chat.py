from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from uuid import UUID

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.schemas.chat import (
    ChatSession, ChatSessionCreate, ChatSessionBookingResponse, 
    ChatSessionsList, Message, MessageCreate, MessageResponse
)
from app.models.user import User
from app.services.chat_service import ChatService

router = APIRouter()


@router.get("/sessions/me", response_model=ChatSessionsList)
def get_my_chat_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^(pending|active|completed|cancelled)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get chat sessions for the current user.
    """
    chat_service = ChatService(db)
    
    sessions, total = chat_service.get_user_chat_sessions(
        user_id=str(current_user.id),
        skip=skip,
        limit=limit,
        status=status
    )
    
    return ChatSessionsList(
        items=[ChatSession.from_orm(session) for session in sessions],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/sessions/book", response_model=ChatSessionBookingResponse)
def book_chat_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Book a new chat session with a counselor.
    """
    chat_service = ChatService(db)
    
    try:
        session = chat_service.book_chat_session(
            user_id=str(current_user.id),
            session_data=session_data
        )
        
        return ChatSessionBookingResponse(
            session_id=str(session.id),
            status=session.status,
            message="Session has been successfully booked."
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to book session"
        )


@router.get("/sessions/{session_id}", response_model=ChatSession)
def get_chat_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get detailed information about a specific chat session.
    """
    chat_service = ChatService(db)
    
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )
    
    session = chat_service.get_chat_session_details(
        session_id=str(session_uuid),
        user_id=str(current_user.id)
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
        )
    
    return ChatSession.from_orm(session)


@router.post("/sessions/{session_id}/cancel")
def cancel_chat_session(
    session_id: str,
    cancel_reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Cancel a chat session.
    """
    chat_service = ChatService(db)
    
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )
    
    try:
        session = chat_service.cancel_chat_session(
            session_id=str(session_uuid),
            user_id=str(current_user.id),
            cancel_reason=cancel_reason
        )
        
        return {"message": "Session has been cancelled."}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel session"
        )


@router.get("/sessions/{session_id}/messages", response_model=List[Message])
def get_chat_messages(
    session_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get messages for a specific chat session.
    """
    chat_service = ChatService(db)
    
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )
    
    try:
        messages = chat_service.get_session_messages(
            session_id=str(session_uuid),
            user_id=str(current_user.id),
            skip=skip,
            limit=limit
        )
        
        return [Message.from_orm(message) for message in messages]
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
def send_chat_message(
    session_id: str,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Send a message in a chat session.
    """
    chat_service = ChatService(db)
    
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )
    
    try:
        message = chat_service.send_message(
            session_id=str(session_uuid),
            sender_id=str(current_user.id),
            sender_type="user",
            message_data=message_data
        )
        
        return MessageResponse(
            id=str(message.id),
            session_id=str(message.session_id),
            sender_id=str(message.sender_id),
            sender_type=message.sender_type,
            content=message.content,
            created_at=message.created_at
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )