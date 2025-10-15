from typing import List, Optional, Tuple
from datetime import date, time, datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc

from app.models.staff import Staff
from app.models.counselor_profile import CounselorProfile
from app.models.time_slot import TimeSlot, CounselorSchedule, CounselorUnavailability
from app.models.chat_session import ChatSession
from app.models.counselor_review import CounselorReview


class CounselorService:
    def __init__(self, db: Session):
        self.db = db

    def get_available_counselors(
        self, 
        skip: int = 0, 
        limit: int = 10,
        specialties: Optional[List[str]] = None,
        min_rating: Optional[float] = None
    ) -> Tuple[List[Staff], int]:
        """
        Get list of available counselors with their profiles.
        """
        query = (
            self.db.query(Staff)
            .join(CounselorProfile, Staff.id == CounselorProfile.staff_id)
            .filter(
                Staff.role == "counselor",
                Staff.is_active == True,
                CounselorProfile.is_available == True
            )
            .options(joinedload(Staff.counselor_profile))
        )

        # Filter by specialties if provided
        if specialties:
            for specialty in specialties:
                query = query.filter(CounselorProfile.specialties.contains([specialty]))

        # Filter by minimum rating if provided
        if min_rating:
            query = query.filter(CounselorProfile.rating >= min_rating)

        # Order by rating desc, then by total sessions desc
        query = query.order_by(
            desc(CounselorProfile.rating),
            desc(CounselorProfile.total_sessions)
        )

        total = query.count()
        counselors = query.offset(skip).limit(limit).all()

        return counselors, total

    def get_counselor_by_id(self, counselor_id: str) -> Optional[Staff]:
        """
        Get counselor details by ID.
        """
        return (
            self.db.query(Staff)
            .join(CounselorProfile, Staff.id == CounselorProfile.staff_id)
            .filter(
                Staff.id == counselor_id,
                Staff.role == "counselor",
                Staff.is_active == True
            )
            .options(
                joinedload(Staff.counselor_profile),
                joinedload(Staff.counselor_profile).joinedload(CounselorProfile.reviews)
            )
            .first()
        )

    def get_counselor_available_slots(
        self,
        counselor_id: str,
        target_date: date
    ) -> List[TimeSlot]:
        """
        Get available time slots for a counselor on a specific date.
        """
        return (
            self.db.query(TimeSlot)
            .filter(
                TimeSlot.counselor_id == counselor_id,
                TimeSlot.date == target_date,
                TimeSlot.is_available == True,
                TimeSlot.is_booked == False
            )
            .order_by(TimeSlot.start_time)
            .all()
        )

    def get_counselor_time_slots(
        self,
        counselor_id: str,
        start_date: date,
        end_date: date,
        include_booked: bool = True
    ) -> List[TimeSlot]:
        """
        Get time slots for a counselor within a date range.
        """
        query = (
            self.db.query(TimeSlot)
            .filter(
                TimeSlot.counselor_id == counselor_id,
                TimeSlot.date >= start_date,
                TimeSlot.date <= end_date
            )
        )

        if not include_booked:
            query = query.filter(TimeSlot.is_booked == False)

        return query.order_by(TimeSlot.date, TimeSlot.start_time).all()

    def create_time_slot(
        self,
        counselor_id: str,
        target_date: date,
        start_time: time,
        end_time: time,
        is_available: bool = True
    ) -> TimeSlot:
        """
        Create a single time slot for a counselor.
        """
        # Check for conflicts
        existing_slot = (
            self.db.query(TimeSlot)
            .filter(
                TimeSlot.counselor_id == counselor_id,
                TimeSlot.date == target_date,
                or_(
                    and_(TimeSlot.start_time <= start_time, TimeSlot.end_time > start_time),
                    and_(TimeSlot.start_time < end_time, TimeSlot.end_time >= end_time),
                    and_(TimeSlot.start_time >= start_time, TimeSlot.end_time <= end_time)
                )
            )
            .first()
        )

        if existing_slot:
            raise ValueError(f"Time slot conflicts with existing slot from {existing_slot.start_time} to {existing_slot.end_time}")

        # Check if counselor is unavailable during this time
        unavailability = (
            self.db.query(CounselorUnavailability)
            .filter(
                CounselorUnavailability.counselor_id == counselor_id,
                CounselorUnavailability.start_date <= target_date,
                CounselorUnavailability.end_date >= target_date
            )
            .first()
        )

        if unavailability:
            # Check time overlap if it's not an all-day unavailability
            if (unavailability.start_time and unavailability.end_time and
                not (end_time <= unavailability.start_time or start_time >= unavailability.end_time)):
                raise ValueError(f"Counselor is unavailable during this time: {unavailability.reason}")
            elif not unavailability.start_time and not unavailability.end_time:
                raise ValueError(f"Counselor is unavailable all day: {unavailability.reason}")

        time_slot = TimeSlot(
            counselor_id=counselor_id,
            date=target_date,
            start_time=start_time,
            end_time=end_time,
            is_available=is_available,
            created_at=datetime.utcnow()
        )

        self.db.add(time_slot)
        self.db.commit()
        self.db.refresh(time_slot)

        return time_slot

    def bulk_create_time_slots(
        self,
        counselor_id: str,
        start_date: date,
        end_date: date,
        time_ranges: List[Tuple[time, time]],
        exclude_dates: Optional[List[date]] = None
    ) -> List[TimeSlot]:
        """
        Bulk create time slots for multiple days.
        """
        if exclude_dates is None:
            exclude_dates = []

        created_slots = []
        current_date = start_date

        while current_date <= end_date:
            if current_date not in exclude_dates:
                for start_time, end_time in time_ranges:
                    try:
                        slot = self.create_time_slot(
                            counselor_id=counselor_id,
                            target_date=current_date,
                            start_time=start_time,
                            end_time=end_time
                        )
                        created_slots.append(slot)
                    except ValueError as e:
                        # Skip conflicting slots but continue with others
                        print(f"Skipping slot on {current_date} {start_time}-{end_time}: {e}")
                        continue

            current_date += timedelta(days=1)

        return created_slots

    def book_time_slot(self, slot_id: str, session_id: str) -> TimeSlot:
        """
        Mark a time slot as booked when a session is created.
        """
        time_slot = self.db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()

        if not time_slot:
            raise ValueError("Time slot not found")

        if time_slot.is_booked:
            raise ValueError("Time slot is already booked")

        if not time_slot.is_available:
            raise ValueError("Time slot is not available")

        time_slot.is_booked = True
        time_slot.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(time_slot)

        return time_slot

    def cancel_time_slot_booking(self, slot_id: str) -> TimeSlot:
        """
        Unbook a time slot when a session is cancelled.
        """
        time_slot = self.db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()

        if not time_slot:
            raise ValueError("Time slot not found")

        time_slot.is_booked = False
        time_slot.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(time_slot)

        return time_slot

def create_counselor_schedule(
        self,
        counselor_id: str,
        name: str,
        days_of_week: List[int],
        start_time: time,
        end_time: time,
        effective_from: date,              # <- 위치 이동
        session_duration_minutes: int = 50, 
        break_duration_minutes: int = 10,
        effective_until: Optional[date] = None,
        created_by: str = None,
        description: Optional[str] = None
    ) -> CounselorSchedule:

        """
        Create a recurring schedule rule for a counselor.
        """
        schedule = CounselorSchedule(
            counselor_id=counselor_id,
            name=name,
            description=description,
            days_of_week=",".join(map(str, days_of_week)),
            start_time=start_time,
            end_time=end_time,
            session_duration_minutes=session_duration_minutes,
            break_duration_minutes=break_duration_minutes,
            effective_from=effective_from,
            effective_until=effective_until,
            created_by=created_by,
            created_at=datetime.utcnow()
        )

        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)

        return schedule

def generate_slots_from_schedule(
        self,
        schedule: CounselorSchedule,
        target_date: date
    ) -> List[TimeSlot]:
        """
        Generate time slots for a specific date based on a schedule rule.
        """
        # Check if the date is within the schedule's effective period
        if target_date < schedule.effective_from:
            return []
        
        if schedule.effective_until and target_date > schedule.effective_until:
            return []

        # Check if the date's weekday is in the schedule
        weekday = target_date.weekday()  # 0=Monday, 6=Sunday
        allowed_days = [int(d) for d in schedule.days_of_week.split(",")]
        
        if weekday not in allowed_days:
            return []

        # Check for unavailability
        unavailability = (
            self.db.query(CounselorUnavailability)
            .filter(
                CounselorUnavailability.counselor_id == schedule.counselor_id,
                CounselorUnavailability.start_date <= target_date,
                CounselorUnavailability.end_date >= target_date
            )
            .first()
        )

        if unavailability:
            return []  # Skip this date entirely if unavailable

        # Generate time slots
        slots = []
        current_time = schedule.start_time
        end_time = schedule.end_time

        while current_time < end_time:
            # Calculate slot end time
            slot_end_datetime = datetime.combine(target_date, current_time) + timedelta(minutes=schedule.session_duration_minutes)
            slot_end_time = slot_end_datetime.time()

            # Check if the slot would exceed the day's end time
            if slot_end_time > end_time:
                break

            # Check for conflicts
            existing_slot = (
                self.db.query(TimeSlot)
                .filter(
                    TimeSlot.counselor_id == schedule.counselor_id,
                    TimeSlot.date == target_date,
                    TimeSlot.start_time == current_time
                )
                .first()
            )

            if not existing_slot:
                slot = TimeSlot(
                    counselor_id=schedule.counselor_id,
                    date=target_date,
                    start_time=current_time,
                    end_time=slot_end_time,
                    is_available=True,
                    is_booked=False,
                    generated_from_schedule_id=schedule.id,
                    created_at=datetime.utcnow()
                )
                
                self.db.add(slot)
                slots.append(slot)

            # Move to next slot time
            next_slot_datetime = datetime.combine(target_date, current_time) + timedelta(
                minutes=schedule.session_duration_minutes + schedule.break_duration_minutes
            )
            current_time = next_slot_datetime.time()

        if slots:
            self.db.commit()
            for slot in slots:
                self.db.refresh(slot)

        return slots