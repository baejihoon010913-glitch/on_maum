from typing import Dict, List, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import json
import logging

from app.schemas.chat import WebSocketMessage, MessageCreate
from app.services.chat_service import ChatService
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # session_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> connection info
        self.connection_info: Dict[WebSocket, dict] = {}

    async def connect(
        self, 
        websocket: WebSocket, 
        session_id: str,
        user_id: str,
        user_type: str  # "user" or "counselor"
    ):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Add to session room
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        
        # Store connection info
        self.connection_info[websocket] = {
            "session_id": session_id,
            "user_id": user_id,
            "user_type": user_type,
            "connected_at": datetime.utcnow()
        }
        
        # Notify others in the session about new connection
        await self.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type="user_joined",
                data={
                    "user_id": user_id,
                    "user_type": user_type,
                    "message": f"{user_type.title()} joined the session"
                }
            ),
            exclude_websocket=websocket
        )
        
        logger.info(f"WebSocket connected: {user_type} {user_id} to session {session_id}")

    def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        if websocket not in self.connection_info:
            return
            
        connection_info = self.connection_info[websocket]
        session_id = connection_info["session_id"]
        user_id = connection_info["user_id"]
        user_type = connection_info["user_type"]
        
        # Remove from session room
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            
            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        
        # Remove connection info
        del self.connection_info[websocket]
        
        # Notify others about disconnection (in background)
        if session_id in self.active_connections:
            import asyncio
            asyncio.create_task(
                self.broadcast_to_session(
                    session_id,
                    WebSocketMessage(
                        type="user_left",
                        data={
                            "user_id": user_id,
                            "user_type": user_type,
                            "message": f"{user_type.title()} left the session"
                        }
                    )
                )
            )
        
        logger.info(f"WebSocket disconnected: {user_type} {user_id} from session {session_id}")

    async def send_personal_message(self, message: WebSocketMessage, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_text(message.json())
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast_to_session(
        self, 
        session_id: str, 
        message: WebSocketMessage,
        exclude_websocket: Optional[WebSocket] = None
    ):
        """Broadcast a message to all connections in a session"""
        if session_id not in self.active_connections:
            return
        
        # Create a copy of the set to avoid modification during iteration
        connections = self.active_connections[session_id].copy()
        
        for websocket in connections:
            if websocket == exclude_websocket:
                continue
                
            try:
                await websocket.send_text(message.json())
            except Exception as e:
                logger.error(f"Error broadcasting to session {session_id}: {e}")
                # Connection might be dead, remove it
                self.disconnect(websocket)

    async def send_to_user_in_session(
        self,
        session_id: str,
        target_user_id: str,
        message: WebSocketMessage
    ):
        """Send a message to a specific user in a session"""
        if session_id not in self.active_connections:
            return
        
        connections = self.active_connections[session_id].copy()
        
        for websocket in connections:
            connection_info = self.connection_info.get(websocket)
            if connection_info and connection_info["user_id"] == target_user_id:
                await self.send_personal_message(message, websocket)

    def get_session_participants(self, session_id: str) -> List[dict]:
        """Get list of active participants in a session"""
        if session_id not in self.active_connections:
            return []
        
        participants = []
        for websocket in self.active_connections[session_id]:
            connection_info = self.connection_info.get(websocket)
            if connection_info:
                participants.append({
                    "user_id": connection_info["user_id"],
                    "user_type": connection_info["user_type"],
                    "connected_at": connection_info["connected_at"].isoformat()
                })
        
        return participants

    def is_session_active(self, session_id: str) -> bool:
        """Check if a session has any active connections"""
        return session_id in self.active_connections and len(self.active_connections[session_id]) > 0


class ChatWebSocketManager:
    def __init__(self):
        self.manager = ConnectionManager()

    async def handle_websocket(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        user_type: str
    ):
        """Main WebSocket handler"""
        
        # Verify session access
        db = SessionLocal()
        chat_service = ChatService(db)
        
        try:
            # Verify user has access to this session
            if user_type == "user":
                session = chat_service.get_chat_session_details(
                    session_id=session_id,
                    user_id=user_id
                )
            else:  # counselor
                session = chat_service.get_chat_session_details(
                    session_id=session_id,
                    counselor_id=user_id
                )
            
            if not session:
                await websocket.close(code=4003, reason="Access denied to session")
                return
            
            # Connect to the session
            await self.manager.connect(websocket, session_id, user_id, user_type)
            
            # Send welcome message with session info
            await self.manager.send_personal_message(
                WebSocketMessage(
                    type="session_info",
                    data={
                        "session_id": session_id,
                        "status": session.status,
                        "participants": self.manager.get_session_participants(session_id),
                        "message": "Connected to chat session"
                    }
                ),
                websocket
            )
            
            # Handle incoming messages
            while True:
                try:
                    data = await websocket.receive_text()
                    message_data = json.loads(data)
                    
                    await self.handle_message(
                        websocket=websocket,
                        session_id=session_id,
                        user_id=user_id,
                        user_type=user_type,
                        message_data=message_data,
                        chat_service=chat_service
                    )
                    
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    await self.manager.send_personal_message(
                        WebSocketMessage(
                            type="error",
                            data={"message": "Invalid JSON format"}
                        ),
                        websocket
                    )
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {e}")
                    await self.manager.send_personal_message(
                        WebSocketMessage(
                            type="error",
                            data={"message": "Server error processing message"}
                        ),
                        websocket
                    )
        
        finally:
            self.manager.disconnect(websocket)
            db.close()

    async def handle_message(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        user_type: str,
        message_data: dict,
        chat_service: ChatService
    ):
        """Handle different types of WebSocket messages"""
        
        message_type = message_data.get("type")
        
        if message_type == "chat_message":
            await self.handle_chat_message(
                websocket, session_id, user_id, user_type,
                message_data, chat_service
            )
        elif message_type == "typing":
            await self.handle_typing_indicator(
                websocket, session_id, user_id, user_type, message_data
            )
        elif message_type == "session_action":
            await self.handle_session_action(
                websocket, session_id, user_id, user_type,
                message_data, chat_service
            )
        else:
            await self.manager.send_personal_message(
                WebSocketMessage(
                    type="error",
                    data={"message": f"Unknown message type: {message_type}"}
                ),
                websocket
            )

    async def handle_chat_message(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        user_type: str,
        message_data: dict,
        chat_service: ChatService
    ):
        """Handle chat message sending"""
        
        content = message_data.get("content", "").strip()
        if not content:
            await self.manager.send_personal_message(
                WebSocketMessage(
                    type="error",
                    data={"message": "Message content cannot be empty"}
                ),
                websocket
            )
            return
        
        try:
            # Save message to database
            message = chat_service.send_message(
                session_id=session_id,
                sender_id=user_id,
                sender_type=user_type,
                message_data=MessageCreate(content=content)
            )
            
            # Broadcast message to all participants
            await self.manager.broadcast_to_session(
                session_id,
                WebSocketMessage(
                    type="new_message",
                    data={
                        "id": str(message.id),
                        "session_id": str(message.session_id),
                        "sender_id": str(message.sender_id),
                        "sender_type": message.sender_type,
                        "content": message.content,
                        "created_at": message.created_at.isoformat()
                    }
                )
            )
            
        except Exception as e:
            await self.manager.send_personal_message(
                WebSocketMessage(
                    type="error",
                    data={"message": f"Failed to send message: {str(e)}"}
                ),
                websocket
            )

    async def handle_typing_indicator(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        user_type: str,
        message_data: dict
    ):
        """Handle typing indicator broadcast"""
        
        is_typing = message_data.get("is_typing", False)
        
        # Broadcast typing status to others in the session
        await self.manager.broadcast_to_session(
            session_id,
            WebSocketMessage(
                type="typing_indicator",
                data={
                    "user_id": user_id,
                    "user_type": user_type,
                    "is_typing": is_typing
                }
            ),
            exclude_websocket=websocket
        )

    async def handle_session_action(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        user_type: str,
        message_data: dict,
        chat_service: ChatService
    ):
        """Handle session control actions (start, end, etc.)"""
        
        action = message_data.get("action")
        
        try:
            if action == "start_session" and user_type == "counselor":
                session = chat_service.start_chat_session(
                    session_id=session_id,
                    counselor_id=user_id
                )
                
                # Broadcast session start to all participants
                await self.manager.broadcast_to_session(
                    session_id,
                    WebSocketMessage(
                        type="session_started",
                        data={
                            "session_id": session_id,
                            "started_by": user_id,
                            "started_at": session.actual_start_time.isoformat(),
                            "message": "Session has been started by the counselor"
                        }
                    )
                )
                
            elif action == "end_session" and user_type == "counselor":
                counselor_notes = message_data.get("counselor_notes", "")
                
                session = chat_service.complete_chat_session(
                    session_id=session_id,
                    counselor_id=user_id,
                    counselor_notes=counselor_notes
                )
                
                # Broadcast session end to all participants
                await self.manager.broadcast_to_session(
                    session_id,
                    WebSocketMessage(
                        type="session_ended",
                        data={
                            "session_id": session_id,
                            "ended_by": user_id,
                            "ended_at": session.actual_end_time.isoformat(),
                            "duration": session.duration,
                            "message": "Session has been completed by the counselor"
                        }
                    )
                )
                
            else:
                await self.manager.send_personal_message(
                    WebSocketMessage(
                        type="error",
                        data={"message": f"Invalid or unauthorized action: {action}"}
                    ),
                    websocket
                )
                
        except Exception as e:
            await self.manager.send_personal_message(
                WebSocketMessage(
                    type="error",
                    data={"message": f"Failed to perform action: {str(e)}"}
                ),
                websocket
            )


# Global WebSocket manager instance
chat_websocket_manager = ChatWebSocketManager()