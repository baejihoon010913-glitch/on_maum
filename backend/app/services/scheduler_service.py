from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
import logging

from app.db.session import SessionLocal
from app.models.time_slot import CounselorSchedule, TimeSlot
from app.models.chat_session import ChatSession
from app.services.counselor_service import CounselorService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False

    def start(self):
        """Start the scheduler with all jobs"""
        if not self.is_running:
            # Schedule daily time slot generation at midnight
            self.scheduler.add_job(
                func=self.generate_daily_time_slots,
                trigger=CronTrigger(hour=0, minute=0),  # Every day at midnight
                id='generate_daily_time_slots',
                name='Generate daily time slots from recurring schedules',
                replace_existing=True
            )

            # Schedule reminder notifications check every minute
            self.scheduler.add_job(
                func=self.check_session_reminders,
                trigger=CronTrigger(minute='*'),  # Every minute
                id='check_session_reminders',
                name='Check for session reminder notifications',
                replace_existing=True
            )

            # Schedule automatic session status updates
            self.scheduler.add_job(
                func=self.update_session_statuses,
                trigger=CronTrigger(minute='*/5'),  # Every 5 minutes
                id='update_session_statuses',
                name='Update overdue session statuses',
                replace_existing=True
            )

            self.scheduler.start()
            self.is_running = True
            logger.info("Scheduler service started")

    def stop(self):
        """Stop the scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler service stopped")

    async def generate_daily_time_slots(self):
        """
        Generate time slots for tomorrow based on active recurring schedules.
        Runs daily at midnight.
        """
        try:
            db = SessionLocal()
            counselor_service = CounselorService(db)
            
            # Target date is tomorrow
            target_date = date.today() + timedelta(days=1)
            
            logger.info(f"Generating time slots for {target_date}")

            # Get all active counselor schedules
            active_schedules = (
                db.query(CounselorSchedule)
                .filter(
                    CounselorSchedule.is_active == True,
                    CounselorSchedule.effective_from <= target_date,
                    (CounselorSchedule.effective_until.is_(None)) |
                    (CounselorSchedule.effective_until >= target_date)
                )
                .all()
            )

            total_generated = 0
            for schedule in active_schedules:
                try:
                    generated_slots = counselor_service.generate_slots_from_schedule(
                        schedule=schedule,
                        target_date=target_date
                    )
                    total_generated += len(generated_slots)
                    
                    if generated_slots:
                        logger.info(
                            f"Generated {len(generated_slots)} slots for counselor "
                            f"{schedule.counselor_id} on {target_date}"
                        )
                        
                except Exception as e:
                    logger.error(
                        f"Failed to generate slots for schedule {schedule.id}: {e}"
                    )
                    continue

            db.close()
            logger.info(f"Generated {total_generated} total time slots for {target_date}")

        except Exception as e:
            logger.error(f"Failed to generate daily time slots: {e}")

    async def check_session_reminders(self):
        """
        Check for upcoming sessions and send reminder notifications.
        Runs every minute.
        """
        try:
            db = SessionLocal()
            notification_service = NotificationService(db)
            
            # Find sessions starting in 10 minutes
            reminder_time = datetime.now() + timedelta(minutes=10)
            
            upcoming_sessions = (
                db.query(ChatSession)
                .filter(
                    ChatSession.status == "pending",
                    ChatSession.scheduled_date == reminder_time.date(),
                    # Check if scheduled time is within the next minute window
                    # (since we run every minute, we need to catch sessions in this window)
                )
                .all()
            )

            for session in upcoming_sessions:
                try:
                    # Combine date and time for comparison
                    session_datetime = datetime.combine(
                        session.scheduled_date,
                        session.scheduled_start_time
                    )
                    
                    # Check if session starts in approximately 10 minutes (±30 seconds)
                    time_diff = session_datetime - datetime.now()
                    if timedelta(minutes=9, seconds=30) <= time_diff <= timedelta(minutes=10, seconds=30):
                        
                        # Check if reminder already sent
                        existing_reminder = notification_service.has_session_reminder(
                            session_id=str(session.id),
                            user_id=str(session.user_id)
                        )
                        
                        if not existing_reminder:
                            notification_service.create_session_reminder_notification(
                                user_id=str(session.user_id),
                                session_id=str(session.id),
                                counselor_name=session.counselor.name,
                                scheduled_datetime=session_datetime
                            )
                            
                            logger.info(
                                f"Sent reminder notification for session {session.id}"
                            )
                            
                except Exception as e:
                    logger.error(
                        f"Failed to send reminder for session {session.id}: {e}"
                    )
                    continue

            db.close()

        except Exception as e:
            logger.error(f"Failed to check session reminders: {e}")

    async def update_session_statuses(self):
        """
        Update statuses of overdue sessions.
        Runs every 5 minutes.
        """
        try:
            db = SessionLocal()
            now = datetime.now()
            
            # Find sessions that should have started but are still pending
            overdue_sessions = (
                db.query(ChatSession)
                .filter(
                    ChatSession.status == "pending"
                )
                .all()
            )

            for session in overdue_sessions:
                try:
                    # Check if session was supposed to start more than 15 minutes ago
                    session_datetime = datetime.combine(
                        session.scheduled_date,
                        session.scheduled_start_time
                    )
                    
                    if now > session_datetime + timedelta(minutes=15):
                        # Auto-cancel sessions that are 15+ minutes overdue
                        session.status = "cancelled"
                        session.counselor_notes = "Auto-cancelled: Session was not started within 15 minutes of scheduled time"
                        session.updated_at = now
                        
                        # Free up the time slot if it was booked
                        if session.time_slot_id:
                            time_slot = db.query(TimeSlot).filter(
                                TimeSlot.id == session.time_slot_id
                            ).first()
                            if time_slot:
                                time_slot.is_booked = False
                                time_slot.updated_at = now
                        
                        logger.info(f"Auto-cancelled overdue session {session.id}")
                        
                except Exception as e:
                    logger.error(
                        f"Failed to update session {session.id}: {e}"
                    )
                    continue

            # Find active sessions that should have ended
            active_sessions = (
                db.query(ChatSession)
                .filter(
                    ChatSession.status == "active"
                )
                .all()
            )

            for session in active_sessions:
                try:
                    session_end_datetime = datetime.combine(
                        session.scheduled_date,
                        session.scheduled_end_time
                    )
                    
                    # If session was supposed to end more than 30 minutes ago, auto-complete it
                    if now > session_end_datetime + timedelta(minutes=30):
                        session.status = "completed"
                        session.actual_end_time = session_end_datetime + timedelta(minutes=30)
                        session.counselor_notes = (
                            f"{session.counselor_notes or ''}\n\n"
                            "Auto-completed: Session exceeded scheduled end time by 30+ minutes"
                        ).strip()
                        session.updated_at = now
                        
                        # Calculate duration
                        if session.actual_start_time:
                            duration = session.actual_end_time - session.actual_start_time
                            session.duration = int(duration.total_seconds() / 60)
                        
                        logger.info(f"Auto-completed overdue session {session.id}")
                        
                except Exception as e:
                    logger.error(
                        f"Failed to complete session {session.id}: {e}"
                    )
                    continue

            db.commit()
            db.close()

        except Exception as e:
            logger.error(f"Failed to update session statuses: {e}")

    def schedule_one_time_reminder(
        self,
        session_id: str,
        user_id: str,
        counselor_name: str,
        scheduled_datetime: datetime
    ):
        """
        Schedule a one-time reminder notification for a specific session.
        """
        reminder_datetime = scheduled_datetime - timedelta(minutes=10)
        
        # Only schedule if the reminder time is in the future
        if reminder_datetime > datetime.now():
            self.scheduler.add_job(
                func=self._send_session_reminder,
                trigger=DateTrigger(run_date=reminder_datetime),
                args=[session_id, user_id, counselor_name, scheduled_datetime],
                id=f'reminder_{session_id}',
                name=f'Session reminder for {session_id}',
                replace_existing=True
            )
            
            logger.info(
                f"Scheduled reminder for session {session_id} at {reminder_datetime}"
            )

    async def _send_session_reminder(
        self,
        session_id: str,
        user_id: str,
        counselor_name: str,
        scheduled_datetime: datetime
    ):
        """
        Send a session reminder notification.
        """
        try:
            db = SessionLocal()
            notification_service = NotificationService(db)
            
            notification_service.create_session_reminder_notification(
                user_id=user_id,
                session_id=session_id,
                counselor_name=counselor_name,
                scheduled_datetime=scheduled_datetime
            )
            
            db.close()
            logger.info(f"Sent scheduled reminder for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to send scheduled reminder for session {session_id}: {e}")

    def cancel_session_reminder(self, session_id: str):
        """
        Cancel a scheduled session reminder.
        """
        job_id = f'reminder_{session_id}'
        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"Cancelled reminder for session {session_id}")
        except:
            # Job might not exist, which is fine
            pass


# Global scheduler instance
scheduler_service = SchedulerService()