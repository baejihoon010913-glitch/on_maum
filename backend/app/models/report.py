from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime


class Report(Base):
    """
    Report model for handling user reports on posts and other content
    """
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Reporter information
    reporter_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # What is being reported
    post_id = Column(UUID(as_uuid=True), ForeignKey('posts.id'), nullable=True)
    # Can be extended to support reporting other content types
    
    # Report details
    reason = Column(String(100), nullable=False)  # 'spam', 'inappropriate_content', etc.
    description = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # Additional details
    
    # Report status and resolution
    status = Column(String(20), nullable=False, default='pending')  # 'pending', 'resolved', 'dismissed'
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey('staff.id'), nullable=True)
    resolution = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    post = relationship("Post", back_populates="reports")
    resolved_by_staff = relationship("Staff", foreign_keys=[resolved_by])

    def __repr__(self):
        return f"<Report(id={self.id}, reason={self.reason}, status={self.status})>"
