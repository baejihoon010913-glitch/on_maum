from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.core.config import settings

router = APIRouter()


@router.post("/profile-image")
def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Upload user profile image
    """
    # TODO: Implement file upload logic
    # Validate file type and size
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP are allowed."
        )
    
    return {
        "message": "Profile image has been successfully uploaded.",
        "image_url": f"/api/uploads/profiles/sample_image.jpg",
        "file_size": 245760,
        "original_filename": file.filename
    }


@router.delete("/profile-image")
def delete_profile_image(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete user profile image
    """
    # TODO: Implement profile image deletion logic
    return {"message": "Profile image has been successfully deleted."}


@router.get("/upload-info")
def get_upload_info() -> Any:
    """
    Get upload settings information
    """
    return {
        "max_file_size": settings.MAX_FILE_SIZE,
        "allowed_extensions": settings.ALLOWED_EXTENSIONS,
        "upload_url": "/api/upload/"
    }