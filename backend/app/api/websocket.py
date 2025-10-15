from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
import jwt
import logging

from app.core.config import settings
from app.db.session import get_db
from app.core.security import get_user_from_token
from app.websocket.chat_manager import chat_websocket_manager
from app.models.user import User
from app.models.staff import Staff

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


async def get_websocket_user(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> tuple[str, str]:  # Returns (user_id, user_type)
    """
    Authenticate WebSocket connection using token from query parameter.
    Returns user_id and user_type ("user" or "counselor").
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=4001, reason="Invalid token: no user ID")
            raise WebSocketDisconnect()
        
        # Check if it's a regular user
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_active:
            return str(user.id), "user"
        
        # Check if it's a staff member (counselor)
        staff = db.query(Staff).filter(Staff.id == user_id).first()
        if staff and staff.is_active and staff.role == "counselor":
            return str(staff.id), "counselor"
        
        # No valid user found
        await websocket.close(code=4002, reason="User not found or inactive")
        raise WebSocketDisconnect()
        
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001, reason="Token expired")
        raise WebSocketDisconnect()
    except jwt.JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        raise WebSocketDisconnect()
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        await websocket.close(code=4000, reason="Authentication failed")
        raise WebSocketDisconnect()


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time chat in counseling sessions.
    
    Connection URL: /ws/chat/{session_id}?token={access_token}
    
    Authentication:
    - Requires valid access_token in query parameter
    - Only session participants (user or counselor) can connect
    
    Message Types:
    - chat_message: Send a chat message
    - typing: Send typing indicator
    - session_action: Control session (start/end) - counselors only
    
    Events Received:
    - session_info: Initial session information
    - new_message: New chat message from other participant
    - user_joined: Someone joined the session
    - user_left: Someone left the session
    - typing_indicator: Typing status from other participant
    - session_started: Session was started by counselor
    - session_ended: Session was completed by counselor
    - error: Error message
    """
    
    try:
        # Authenticate the WebSocket connection
        user_id, user_type = await get_websocket_user(websocket, token, db)
        
        # Handle the WebSocket connection
        await chat_websocket_manager.handle_websocket(
            websocket=websocket,
            session_id=session_id,
            user_id=user_id,
            user_type=user_type
        )
        
    except WebSocketDisconnect:
        # Normal disconnection, already handled
        pass
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        try:
            await websocket.close(code=4000, reason="Server error")
        except:
            pass


@router.get("/ws/chat/{session_id}/info")
async def get_websocket_session_info(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_token)
):
    """
    Get information about active WebSocket connections for a session.
    Useful for checking if participants are online.
    """
    # Check if user has access to this session
    from app.services.chat_service import ChatService
    chat_service = ChatService(db)
    
    # Try to get session as user first
    session = chat_service.get_chat_session_details(
        session_id=session_id,
        user_id=str(current_user.id)
    )
    
    # If not found, try as counselor (if user is staff)
    if not session:
        staff = db.query(Staff).filter(Staff.id == current_user.id).first()
        if staff and staff.role == "counselor":
            session = chat_service.get_chat_session_details(
                session_id=session_id,
                counselor_id=str(staff.id)
            )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
        )
    
    # Get active connection info
    participants = chat_websocket_manager.manager.get_session_participants(session_id)
    is_active = chat_websocket_manager.manager.is_session_active(session_id)
    
    return {
        "session_id": session_id,
        "status": session.status,
        "is_websocket_active": is_active,
        "active_participants": participants,
        "total_participants": len(participants)
    }