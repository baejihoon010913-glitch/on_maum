import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import AuthTokens


class TokenService:
    """Service for managing JWT and refresh tokens"""
    
    @staticmethod
    def _hash_token(token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @classmethod
    def create_tokens_for_user(
        cls, 
        user: User, 
        db: Session, 
        request: Optional[Request] = None
    ) -> AuthTokens:
        """Create access and refresh tokens for user"""
        
        # Create tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Store refresh token in database
        refresh_token_hash = cls._hash_token(refresh_token)
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Extract request info if available
        user_agent = None
        ip_address = None
        if request:
            user_agent = request.headers.get("user-agent")
            ip_address = request.client.host if request.client else None
        
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        
        db.add(db_refresh_token)
        db.commit()
        
        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    @classmethod
    def refresh_access_token(
        cls, 
        refresh_token: str, 
        db: Session,
        request: Optional[Request] = None
    ) -> Optional[AuthTokens]:
        """Refresh access token using refresh token"""
        
        # Verify refresh token
        token_data = verify_token(refresh_token)
        if not token_data:
            return None
        
        # Check if refresh token exists and is valid
        refresh_token_hash = cls._hash_token(refresh_token)
        db_refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == refresh_token_hash,
            RefreshToken.is_active == True,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not db_refresh_token:
            return None
        
        # Get user
        user = db.query(User).filter(User.id == token_data.user_id).first()
        if not user or not user.is_active:
            return None
        
        # Update last used timestamp
        db_refresh_token.last_used = datetime.utcnow()
        
        # Create new tokens
        new_tokens = cls.create_tokens_for_user(user, db, request)
        
        # Deactivate old refresh token
        db_refresh_token.is_active = False
        db.commit()
        
        return new_tokens
    
    @classmethod
    def revoke_refresh_token(cls, refresh_token: str, db: Session) -> bool:
        """Revoke a specific refresh token"""
        refresh_token_hash = cls._hash_token(refresh_token)
        db_refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == refresh_token_hash,
            RefreshToken.is_active == True
        ).first()
        
        if db_refresh_token:
            db_refresh_token.is_active = False
            db.commit()
            return True
        
        return False
    
    @classmethod
    def revoke_all_user_tokens(cls, user_id: str, db: Session) -> int:
        """Revoke all refresh tokens for a user"""
        result = db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_active == True
        ).update({"is_active": False})
        
        db.commit()
        return result
    
    @classmethod
    def cleanup_expired_tokens(cls, db: Session) -> int:
        """Clean up expired refresh tokens"""
        result = db.query(RefreshToken).filter(
            RefreshToken.expires_at < datetime.utcnow()
        ).delete()
        
        db.commit()
        return result