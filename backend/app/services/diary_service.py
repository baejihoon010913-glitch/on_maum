from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from collections import Counter

from app.models.diary import Diary
from app.models.user import User
from app.schemas.diary import DiaryCreate, DiaryUpdate


class DiaryService:
    """Service for managing diaries"""
    
    @staticmethod
    def create_diary(
        db: Session,
        diary_data: DiaryCreate,
        user: User
    ) -> Diary:
        """Create a new diary entry"""
        diary = Diary(
            user_id=user.id,
            title=diary_data.title,
            content=diary_data.content,
            mood=diary_data.mood
        )
        
        db.add(diary)
        db.commit()
        db.refresh(diary)
        
        return diary
    
    @staticmethod
    def get_user_diaries(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        mood: Optional[str] = None
    ) -> List[Diary]:
        """Get user's diary entries with filtering"""
        query = db.query(Diary).filter(Diary.user_id == user_id)
        
        if mood:
            query = query.filter(Diary.mood == mood)
        
        diaries = query.order_by(desc(Diary.created_at))\
                      .offset(skip)\
                      .limit(limit)\
                      .all()
        
        return diaries
    
    @staticmethod
    def update_diary(
        db: Session,
        diary: Diary,
        diary_data: DiaryUpdate
    ) -> Diary:
        """Update diary entry"""
        update_data = diary_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(diary, field, value)
        
        db.commit()
        db.refresh(diary)
        
        return diary
    
    @staticmethod
    def get_diary_statistics(
        db: Session,
        user_id: str,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """Get diary statistics for a specific month"""
        # Base query for the month
        month_query = db.query(Diary).filter(
            and_(
                Diary.user_id == user_id,
                extract('year', Diary.created_at) == year,
                extract('month', Diary.created_at) == month
            )
        )
        
        # Total entries
        total_entries = month_query.count()
        
        # Mood distribution
        mood_data = db.query(
            Diary.mood,
            func.count(Diary.id).label('count')
        ).filter(
            and_(
                Diary.user_id == user_id,
                extract('year', Diary.created_at) == year,
                extract('month', Diary.created_at) == month,
                Diary.mood.isnot(None)
            )
        ).group_by(Diary.mood).all()
        
        mood_distribution = {
            mood_item.mood: mood_item.count 
            for mood_item in mood_data
        }
        
        # Most active day
        day_data = db.query(
            func.date(Diary.created_at).label('date'),
            func.count(Diary.id).label('count')
        ).filter(
            and_(
                Diary.user_id == user_id,
                extract('year', Diary.created_at) == year,
                extract('month', Diary.created_at) == month
            )
        ).group_by(func.date(Diary.created_at))\
         .order_by(desc(func.count(Diary.id)))\
         .first()
        
        most_active_day = day_data.date.strftime('%Y-%m-%d') if day_data else None
        
        # Writing streak (consecutive days with entries)
        writing_streak = DiaryService._calculate_writing_streak(
            db, user_id, year, month
        )
        
        # Average length
        avg_length_result = db.query(
            func.avg(func.length(Diary.content)).label('avg_length')
        ).filter(
            and_(
                Diary.user_id == user_id,
                extract('year', Diary.created_at) == year,
                extract('month', Diary.created_at) == month
            )
        ).scalar()
        
        average_length = int(avg_length_result) if avg_length_result else 0
        
        return {
            "year": year,
            "month": month,
            "total_entries": total_entries,
            "mood_distribution": mood_distribution,
            "most_active_day": most_active_day,
            "writing_streak": writing_streak,
            "average_length": average_length
        }
    
    @staticmethod
    def _calculate_writing_streak(
        db: Session,
        user_id: str,
        year: int,
        month: int
    ) -> int:
        """Calculate the longest writing streak in days"""
        # Get all dates with diary entries for the month
        dates_with_entries = db.query(
            func.date(Diary.created_at).label('entry_date')
        ).filter(
            and_(
                Diary.user_id == user_id,
                extract('year', Diary.created_at) == year,
                extract('month', Diary.created_at) == month
            )
        ).distinct().all()
        
        if not dates_with_entries:
            return 0
        
        # Convert to date objects and sort
        entry_dates = sorted([entry.entry_date for entry in dates_with_entries])
        
        # Calculate longest consecutive streak
        max_streak = 1
        current_streak = 1
        
        for i in range(1, len(entry_dates)):
            # Check if dates are consecutive
            if (entry_dates[i] - entry_dates[i-1]).days == 1:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1
        
        return max_streak
    
    @staticmethod
    def get_similar_mood_diaries(
        db: Session,
        user_id: str,
        diary_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get other diaries with similar mood"""
        # Get the mood of the current diary
        current_diary = db.query(Diary).filter(
            and_(
                Diary.id == diary_id,
                Diary.user_id == user_id
            )
        ).first()
        
        if not current_diary or not current_diary.mood:
            return []
        
        # Find other diaries with the same mood
        similar_diaries = db.query(Diary).filter(
            and_(
                Diary.user_id == user_id,
                Diary.mood == current_diary.mood,
                Diary.id != diary_id
            )
        ).order_by(desc(Diary.created_at))\
         .limit(limit)\
         .all()
        
        return [
            {
                "id": str(diary.id),
                "title": diary.title,
                "created_at": diary.created_at.isoformat() + "Z",
                "mood": diary.mood
            }
            for diary in similar_diaries
        ]
    
    @staticmethod
    def get_diary_by_date(
        db: Session,
        user_id: str,
        target_date: date
    ) -> Optional[Diary]:
        """Get diary entry for a specific date"""
        diary = db.query(Diary).filter(
            and_(
                Diary.user_id == user_id,
                func.date(Diary.created_at) == target_date
            )
        ).first()
        
        return diary