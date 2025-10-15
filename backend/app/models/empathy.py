from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class Empathy(Base):
    __tablename__ = "empathies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ensure one empathy per user per post
    __table_args__ = (
        UniqueConstraint('user_id', 'post_id', name='unique_user_post_empathy'),
    )
    
    # Relationships
    user = relationship("User", back_populates="empathies")
    post = relationship("Post", back_populates="empathies")