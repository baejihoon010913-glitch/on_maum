from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Any
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.services.naver_oauth import NaverOAuthService
from app.services.token_service import TokenService
from app.schemas.auth import (
    SNSLoginRequest, 
    OnboardingRequest, 
    LoginResponse, 
    AuthTokens,
    RefreshTokenRequest,
    AccountDeletionRequest,
    AccountDeletionResponse
)
from app.schemas.user import User as UserSchema
from app.schemas.user_consent import (
    UserConsentCreate,
    UserConsentResponse,
    UserConsentsResponse
)
from app.models.user import User as UserModel
from app.models.user_consent import UserConsent
from app.models.chat_session import ChatSession

router = APIRouter()


@router.post("/sns-login/naver", response_model=LoginResponse)
async def naver_login(
    request_data: SNSLoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Naver OAuth login
    """
    print(f"Received Naver login request: code={request_data.code}, state={request_data.state}")
    # Verify with Naver OAuth
    sns_profile_data = await NaverOAuthService.verify_user(
        request_data.code, 
        request_data.state
    )
    
    if not sns_profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Naver OAuth code or state"
        )
    
    # Check if user already exists
    existing_user = db.query(UserModel).filter(
        UserModel.sns_provider == "naver",
        UserModel.sns_id == sns_profile_data["sns_id"]
    ).first()
    
    if existing_user:
        # Existing user - update last login and return tokens
        existing_user.last_login = datetime.utcnow()
        db.commit()
        
        # Create tokens
        tokens = TokenService.create_tokens_for_user(existing_user, db, request)
        
        return LoginResponse(
            is_new_user=False,
            user={
                "id": str(existing_user.id),
                "email": existing_user.email,
                "nickname": existing_user.nickname,
                "profile_image": existing_user.profile_image,
                "is_active": existing_user.is_active,
                "created_at": existing_user.created_at.isoformat() + "Z",
                "last_login": existing_user.last_login.isoformat() + "Z" if existing_user.last_login else None
            },
            tokens={
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "token_type": tokens.token_type,
                "expires_in": tokens.expires_in
            },
            sns_profile=None
        )
    else:
        # New user - return SNS profile for onboarding
        return LoginResponse(
            is_new_user=True,
            user=None,
            tokens=None,
            sns_profile=sns_profile_data
        )


@router.post("/complete-onboarding", response_model=dict)
async def complete_onboarding(
    request_data: OnboardingRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Complete user onboarding
    """
    # Check if nickname is available
    existing_nickname = db.query(UserModel).filter(
        UserModel.nickname == request_data.nickname
    ).first()
    
    if existing_nickname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nickname is already taken"
        )
    
    # Check if user with same SNS ID already exists
    existing_user = db.query(UserModel).filter(
        UserModel.sns_provider == request_data.sns_provider,
        UserModel.sns_id == request_data.sns_id
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    # Create new user
    new_user = UserModel(
        email=request_data.email,
        nickname=request_data.nickname,
        birth_year=request_data.birth_year,
        gender=request_data.gender,
        sns_provider=request_data.sns_provider,
        sns_id=request_data.sns_id,
        is_active=True,
        last_login=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create tokens
    tokens = TokenService.create_tokens_for_user(new_user, db, request)
    
    return {
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "nickname": new_user.nickname,
            "profile_image": new_user.profile_image,
            "is_active": new_user.is_active,
            "created_at": new_user.created_at.isoformat() + "Z"
        },
        "tokens": {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "token_type": tokens.token_type,
            "expires_in": tokens.expires_in
        }
    }


@router.get("/check-nickname/{nickname}")
async def check_nickname(nickname: str, db: Session = Depends(get_db)) -> Any:
    """
    Check nickname availability
    """
    if len(nickname) < 2 or len(nickname) > 10:
        return {
            "available": False,
            "message": "Nickname must be between 2 and 10 characters."
        }
    
    existing_user = db.query(UserModel).filter(
        UserModel.nickname == nickname
    ).first()
    
    if existing_user:
        return {
            "available": False,
            "message": "Nickname is already taken."
        }
    
    return {
        "available": True,
        "message": "Nickname is available."
    }


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Get current user information
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nickname": current_user.nickname,
        "profile_image": current_user.profile_image,
        "birth_year": current_user.birth_year,
        "gender": current_user.gender,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() + "Z",
        "last_login": current_user.last_login.isoformat() + "Z" if current_user.last_login else None
    }


@router.post("/refresh", response_model=AuthTokens)
async def refresh_token(
    request_data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token
    """
    new_tokens = TokenService.refresh_access_token(
        request_data.refresh_token, 
        db, 
        request
    )
    
    if not new_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    return new_tokens


@router.post("/logout")
async def logout(
    request_data: RefreshTokenRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Logout current user
    """
    # Revoke the specific refresh token
    TokenService.revoke_refresh_token(request_data.refresh_token, db)
    
    return {"message": "Successfully logged out."}


@router.delete("/me", response_model=AccountDeletionResponse)
async def delete_account(
    request_data: AccountDeletionRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete current user account
    """
    # Verify confirmation text
    if request_data.confirmation_text != "I permanently delete my OnMaum account.":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation text doesn't match."
        )
    
    # Check for ongoing counseling sessions
    ongoing_sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatSession.status.in_(["pending", "active"])
    ).all()
    
    if ongoing_sessions:
        blocking_sessions = [
            {
                "session_id": str(session.id),
                "scheduled_date": session.scheduled_date.strftime("%Y-%m-%d"),
                "counselor_name": "Counselor"  # TODO: Get actual counselor name
            }
            for session in ongoing_sessions
        ]
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete account due to ongoing counseling sessions. Please try again after session completion.",
            headers={"blocking_sessions": str(blocking_sessions)}
        )
    
    # Revoke all tokens
    TokenService.revoke_all_user_tokens(str(current_user.id), db)
    
    # Mark user as inactive instead of hard delete for data retention
    current_user.is_active = False
    current_user.email = f"deleted_{current_user.id}@deleted.local"
    current_user.nickname = f"deleted_{current_user.id}"
    
    db.commit()
    
    deleted_at = datetime.utcnow()
    
    return AccountDeletionResponse(
        message="Account has been successfully deleted. Thank you for using our service.",
        deleted_at=deleted_at.isoformat() + "Z",
        data_retention_info={
            "anonymized_data": "Some anonymized data may be retained for statistical purposes.",
            "deletion_period": "Personal information will be deleted immediately, and some records may be retained for up to 3 years in accordance with related laws."
        }
    )


@router.post("/me/consent", response_model=UserConsentResponse)
async def create_user_consent(
    request_data: UserConsentCreate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Set user consent for counselor history access
    """
    # Check if consent already exists for this type
    existing_consent = db.query(UserConsent).filter(
        UserConsent.user_id == current_user.id,
        UserConsent.consent_type == request_data.consent_type
    ).first()
    
    if existing_consent:
        # Update existing consent
        existing_consent.consent_granted = request_data.consent_granted
        existing_consent.consent_details = request_data.consent_details
        existing_consent.granted_at = datetime.utcnow()
        
        # Set expiration (30 days from now)
        if request_data.consent_granted:
            retention_days = 30
            if request_data.consent_details and "data_retention_days" in request_data.consent_details:
                retention_days = request_data.consent_details["data_retention_days"]
            existing_consent.expires_at = datetime.utcnow() + timedelta(days=retention_days)
        else:
            existing_consent.expires_at = None
            
        db.commit()
        consent = existing_consent
    else:
        # Create new consent
        consent = UserConsent(
            user_id=current_user.id,
            consent_type=request_data.consent_type,
            consent_granted=request_data.consent_granted,
            consent_details=request_data.consent_details
        )
        
        # Set expiration (30 days from now)
        if request_data.consent_granted:
            retention_days = 30
            if request_data.consent_details and "data_retention_days" in request_data.consent_details:
                retention_days = request_data.consent_details["data_retention_days"]
            consent.expires_at = datetime.utcnow() + timedelta(days=retention_days)
        
        db.add(consent)
        db.commit()
        db.refresh(consent)
    
    return UserConsentResponse(
        consent_id=consent.id,
        consent_type=consent.consent_type,
        consent_granted=consent.consent_granted,
        consent_details=consent.consent_details,
        granted_at=consent.granted_at,
        expires_at=consent.expires_at,
        can_revoke=True
    )


@router.get("/me/consent", response_model=UserConsentsResponse)
async def get_user_consents(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user consent history
    """
    consents = db.query(UserConsent).filter(
        UserConsent.user_id == current_user.id
    ).all()
    
    consent_history = [
        {
            "consent_id": consent.id,
            "consent_type": consent.consent_type,
            "consent_granted": consent.consent_granted,
            "granted_at": consent.granted_at,
            "expires_at": consent.expires_at,
            "last_accessed": consent.last_accessed,
            "access_count": consent.access_count
        }
        for consent in consents
    ]
    
    return UserConsentsResponse(
        consents=consent_history
    )