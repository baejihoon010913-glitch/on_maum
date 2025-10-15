from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.core.security import get_current_active_user, create_access_token, create_refresh_token
from app.schemas.auth import SNSLoginRequest, OnboardingRequest, LoginResponse, Token
from app.schemas.user import User
from app.models.user import User as UserModel

router = APIRouter()


@router.post("/sns-login/naver", response_model=LoginResponse)
def naver_login(request: SNSLoginRequest, db: Session = Depends(get_db)) -> Any:
    """
    Naver OAuth login
    """
    # TODO: Implement Naver OAuth verification
    # This is a placeholder implementation
    return {
        "is_new_user": True,
        "user": None,
        "tokens": None,
        "sns_profile": {
            "provider": "naver",
            "sns_id": "sample_id",
            "email": "user@example.com",
            "name": "Sample User",
            "profile_image": None
        }
    }


@router.post("/complete-onboarding", response_model=dict)
def complete_onboarding(request: OnboardingRequest, db: Session = Depends(get_db)) -> Any:
    """
    Complete user onboarding
    """
    # TODO: Implement user creation logic
    # This is a placeholder implementation
    return {"message": "Onboarding completed successfully"}


@router.get("/check-nickname/{nickname}")
def check_nickname(nickname: str, db: Session = Depends(get_db)) -> Any:
    """
    Check nickname availability
    """
    # TODO: Check if nickname exists in database
    return {"available": True, "message": "Nickname is available."}


@router.get("/me", response_model=User)
def get_current_user_info(current_user: UserModel = Depends(get_current_active_user)) -> Any:
    """
    Get current user information
    """
    return current_user


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)) -> Any:
    """
    Refresh access token
    """
    # TODO: Implement token refresh logic
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh token endpoint not implemented yet"
    )


@router.post("/logout")
def logout(current_user: UserModel = Depends(get_current_active_user)) -> Any:
    """
    Logout current user
    """
    return {"message": "Successfully logged out."}


@router.delete("/me")
def delete_account(current_user: UserModel = Depends(get_current_active_user)) -> Any:
    """
    Delete current user account
    """
    # TODO: Implement account deletion logic
    return {"message": "Account has been successfully deleted."}