from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.schemas.diary import Diary, DiaryCreate, DiaryUpdate, DiaryStatistics
from app.models.user import User
from app.services.diary_service import DiaryService

router = APIRouter()


@router.get("/", response_model=dict)
def get_diaries(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    mood: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get user's diary entries with pagination and filtering
    """
    diary_service = DiaryService(db)
    diaries, total = diary_service.get_user_diaries(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        mood=mood,
        year=year,
        month=month
    )
    
    return {
        "items": [Diary.from_orm(diary) for diary in diaries],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/", response_model=Diary)
def create_diary(
    diary_data: DiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new diary entry
    """
    diary_service = DiaryService(db)
    
    try:
        diary = diary_service.create_diary(
            user_id=current_user.id,
            diary_data=diary_data
        )
        return Diary.from_orm(diary)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create diary entry"
        )


@router.get("/statistics", response_model=DiaryStatistics)
def get_diary_statistics(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get comprehensive diary statistics including mood distribution and writing streaks
    """
    diary_service = DiaryService(db)
    
    # Use current date if year/month not provided
    current_date = datetime.now()
    target_year = year or current_date.year
    target_month = month or current_date.month
    
    try:
        statistics = diary_service.get_diary_statistics(
            user_id=current_user.id,
            year=target_year,
            month=target_month
        )
        
        return DiaryStatistics(**statistics)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve diary statistics"
        )


@router.get("/{diary_id}", response_model=Diary)
def get_diary(
    diary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get diary details by ID
    """
    diary_service = DiaryService(db)
    
    try:
        diary_uuid = UUID(diary_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid diary ID format"
        )
    
    diary = diary_service.get_diary_by_id(
        diary_id=diary_uuid,
        user_id=current_user.id
    )
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary entry not found or access denied"
        )
    
    return Diary.from_orm(diary)


@router.put("/{diary_id}", response_model=Diary)
def update_diary(
    diary_id: str,
    diary_data: DiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a diary entry
    """
    diary_service = DiaryService(db)
    
    try:
        diary_uuid = UUID(diary_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid diary ID format"
        )
    
    try:
        diary = diary_service.update_diary(
            diary_id=diary_uuid,
            user_id=current_user.id,
            diary_data=diary_data
        )
        
        if not diary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diary entry not found or access denied"
            )
        
        return Diary.from_orm(diary)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update diary entry"
        )


@router.delete("/{diary_id}")
def delete_diary(
    diary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a diary entry
    """
    diary_service = DiaryService(db)
    
    try:
        diary_uuid = UUID(diary_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid diary ID format"
        )
    
    success = diary_service.delete_diary(
        diary_id=diary_uuid,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary entry not found or access denied"
        )
    
    return {"message": "Diary entry has been deleted successfully."}


@router.get("/{diary_id}/similar", response_model=List[Diary])
def get_similar_mood_diaries(
    diary_id: str,
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get diaries with similar mood for emotional pattern analysis
    """
    diary_service = DiaryService(db)
    
    try:
        diary_uuid = UUID(diary_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid diary ID format"
        )
    
    try:
        similar_diaries = diary_service.get_similar_mood_diaries(
            diary_id=diary_uuid,
            user_id=current_user.id,
            limit=limit
        )
        
        return [Diary.from_orm(diary) for diary in similar_diaries]
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve similar mood diaries"
        )