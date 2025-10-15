from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class EmojiReaction(Base):
    __tablename__ = "emoji_reactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    emoji = Column(String, nullable=False)  # The emoji character
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ensure one emoji reaction per user per post (they can change their emoji)
    __table_args__ = (
        UniqueConstraint('user_id', 'post_id', name='unique_user_post_emoji'),
    )
    
    # Relationships
    user = relationship("User", back_populates="emoji_reactions")
    post = relationship("Post", back_populates="emoji_reactions")