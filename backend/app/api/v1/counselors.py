from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from uuid import UUID
from datetime import date, time
import time as time_module

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.schemas.counselor import (
    Counselor, CounselorsList, TimeSlot, TimeSlotCreate, 
    TimeSlotBulkCreate, CounselorAvailableSlots
)
from app.models.user import User
from app.services.counselor_service import CounselorService

router = APIRouter()


@router.get("/available", response_model=CounselorsList)
def get_available_counselors(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    specialties: Optional[List[str]] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get list of available counselors with their profiles.
    """
    counselor_service = CounselorService(db)
    
    counselors, total = counselor_service.get_available_counselors(
        skip=skip,
        limit=limit,
        specialties=specialties,
        min_rating=min_rating
    )
    
    return CounselorsList(
        items=[Counselor.from_orm(counselor) for counselor in counselors],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{counselor_id}", response_model=Counselor)
def get_counselor_details(
    counselor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get detailed information about a specific counselor.
    """
    counselor_service = CounselorService(db)
    
    try:
        counselor_uuid = UUID(counselor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid counselor ID format"
        )
    
    counselor = counselor_service.get_counselor_by_id(str(counselor_uuid))
    
    if not counselor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Counselor not found"
        )
    
    return Counselor.from_orm(counselor)


@router.get("/{counselor_id}/slots", response_model=CounselorAvailableSlots)
def get_counselor_available_slots(
    counselor_id: str,
    date: date = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get available time slots for a counselor on a specific date.
    """
    counselor_service = CounselorService(db)
    
    try:
        counselor_uuid = UUID(counselor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid counselor ID format"
        )
    
    # Verify counselor exists
    counselor = counselor_service.get_counselor_by_id(str(counselor_uuid))
    if not counselor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Counselor not found"
        )
    
    slots = counselor_service.get_counselor_available_slots(
        counselor_id=str(counselor_uuid),
        target_date=date
    )
    
    return CounselorAvailableSlots(
        counselor_id=str(counselor_uuid),
        date=date,
        available_slots=[TimeSlot.from_orm(slot) for slot in slots]
    )


@router.post("/{counselor_id}/time-slots", response_model=TimeSlot)
def create_time_slot(
    counselor_id: str,
    slot_data: TimeSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new time slot for a counselor.
    Note: This endpoint is typically used by counselors or admin staff.
    """
    counselor_service = CounselorService(db)
    
    try:
        counselor_uuid = UUID(counselor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid counselor ID format"
        )
    
    # Verify counselor exists
    counselor = counselor_service.get_counselor_by_id(str(counselor_uuid))
    if not counselor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Counselor not found"
        )
    
    try:
        time_slot = counselor_service.create_time_slot(
            counselor_id=str(counselor_uuid),
            target_date=slot_data.date,
            start_time=slot_data.start_time,
            end_time=slot_data.end_time,
            is_available=slot_data.is_available
        )
        
        return TimeSlot.from_orm(time_slot)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create time slot"
        )


@router.get("/{counselor_id}/time-slots", response_model=List[TimeSlot])
def get_counselor_time_slots(
    counselor_id: str,
    start_date: date = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: date = Query(..., description="End date in YYYY-MM-DD format"),
    include_booked: bool = Query(True, description="Include booked slots in results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get time slots for a counselor within a date range.
    """
    counselor_service = CounselorService(db)
    
    try:
        counselor_uuid = UUID(counselor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid counselor ID format"
        )
    
    # Validate date range
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Verify counselor exists
    counselor = counselor_service.get_counselor_by_id(str(counselor_uuid))
    if not counselor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Counselor not found"
        )
    
    slots = counselor_service.get_counselor_time_slots(
        counselor_id=str(counselor_uuid),
        start_date=start_date,
        end_date=end_date,
        include_booked=include_booked
    )
    
    return [TimeSlot.from_orm(slot) for slot in slots]


@router.post("/{counselor_id}/time-slots/bulk", response_model=List[TimeSlot])
def bulk_create_time_slots(
    counselor_id: str,
    bulk_data: TimeSlotBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Bulk create time slots for multiple days.
    """
    counselor_service = CounselorService(db)
    
    try:
        counselor_uuid = UUID(counselor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid counselor ID format"
        )
    
    # Validate date range
    if bulk_data.end_date < bulk_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Verify counselor exists
    counselor = counselor_service.get_counselor_by_id(str(counselor_uuid))
    if not counselor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Counselor not found"
        )
    
    try:
        # Convert time range strings to time objects
        time_ranges = []
        for time_range in bulk_data.time_ranges:
            start_time = time.fromisoformat(time_range.start_time)
            end_time = time.fromisoformat(time_range.end_time)
            time_ranges.append((start_time, end_time))
        
        created_slots = counselor_service.bulk_create_time_slots(
            counselor_id=str(counselor_uuid),
            start_date=bulk_data.start_date,
            end_date=bulk_data.end_date,
            time_ranges=time_ranges,
            exclude_dates=bulk_data.exclude_dates
        )
        
        return [TimeSlot.from_orm(slot) for slot in created_slots]
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create time slots"
        )