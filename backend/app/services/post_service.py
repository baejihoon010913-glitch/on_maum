from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc, asc, text
from typing import List, Optional, Tuple
from datetime import datetime

from app.models.post import Post
from app.models.user import User
from app.models.empathy import Empathy
from app.models.emoji_reaction import EmojiReaction
from app.schemas.post import PostCreate, PostUpdate
from app.services.notification_service import NotificationService


class PostService:
    """Service for managing posts"""
    
    @staticmethod
    def create_post(
        db: Session, 
        post_data: PostCreate, 
        user: User
    ) -> Post:
        """Create a new post"""
        post = Post(
            user_id=user.id,
            title=post_data.title,
            content=post_data.content,
            category=post_data.category,
            is_private=post_data.is_private
        )
        
        db.add(post)
        db.commit()
        db.refresh(post)
        
        return post
    
    @staticmethod
    def get_posts_with_pagination(
        db: Session,
        skip: int = 0,
        limit: int = 10,
        category: Optional[str] = None,
        user_id: Optional[str] = None,
        include_private: bool = False
    ) -> Tuple[List[Post], int]:
        """Get posts with pagination and filters"""
        query = db.query(Post)
        
        # Filter conditions
        conditions = []
        
        # Category filter
        if category:
            conditions.append(Post.category == category)
        
        # Privacy filter
        if include_private and user_id:
            # Show public posts + user's private posts
            conditions.append(
                or_(
                    Post.is_private == False,
                    and_(Post.is_private == True, Post.user_id == user_id)
                )
            )
        else:
            # Only show public posts
            conditions.append(Post.is_private == False)
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        posts = query.order_by(desc(Post.created_at))\
                     .offset(skip)\
                     .limit(limit)\
                     .all()
        
        return posts, total
    
    @staticmethod
    def search_posts(
        db: Session,
        search_query: str,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "relevance",
        user_id: Optional[str] = None,
        include_private: bool = False
    ) -> Tuple[List[Post], int]:
        """Search posts with full-text search"""
        # Base query conditions
        conditions = []
        
        # Privacy filter
        if include_private and user_id:
            conditions.append(
                or_(
                    Post.is_private == False,
                    and_(Post.is_private == True, Post.user_id == user_id)
                )
            )
        else:
            conditions.append(Post.is_private == False)
        
        # Text search conditions
        search_conditions = or_(
            Post.title.ilike(f"%{search_query}%"),
            Post.content.ilike(f"%{search_query}%")
        )
        
        conditions.append(search_conditions)
        
        query = db.query(Post).filter(and_(*conditions))
        
        # Apply sorting
        if sort_by == "latest":
            query = query.order_by(desc(Post.created_at))
        elif sort_by == "empathy_count":
            query = query.order_by(desc(Post.empathy_count))
        else:  # relevance (default)
            # Simple relevance: prioritize title matches, then by creation date
            query = query.order_by(
                desc(Post.title.ilike(f"%{search_query}%")),
                desc(Post.created_at)
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        posts = query.offset(skip).limit(limit).all()
        
        return posts, total
    
    @staticmethod
    def increment_view_count(db: Session, post: Post) -> Post:
        """Increment post view count"""
        post.view_count += 1
        db.commit()
        return post
    
    @staticmethod
    def toggle_empathy(
        db: Session, 
        post: Post, 
        user: User
    ) -> Tuple[bool, Post]:
        """Toggle empathy for a post"""
        existing_empathy = db.query(Empathy).filter(
            Empathy.post_id == post.id,
            Empathy.user_id == user.id
        ).first()
        
        if existing_empathy:
            # Remove empathy
            db.delete(existing_empathy)
            post.empathy_count = max(0, post.empathy_count - 1)
            empathized = False
        else:
            # Add empathy
            new_empathy = Empathy(
                post_id=post.id,
                user_id=user.id
            )
            db.add(new_empathy)
            post.empathy_count += 1
            empathized = True
            
            # Create notification for post author (if not self-empathy)
            if str(post.user_id) != str(user.id):
                NotificationService.create_empathy_notification(
                    db=db,
                    post_author_id=str(post.user_id),
                    empathizer_nickname=user.nickname,
                    post_title=post.title,
                    post_id=str(post.id)
                )
        
        db.commit()
        return empathized, post
    
    @staticmethod
    def add_emoji_reaction(
        db: Session,
        post: Post,
        user: User,
        emoji: str
    ) -> EmojiReaction:
        """Add or update emoji reaction"""
        existing_reaction = db.query(EmojiReaction).filter(
            EmojiReaction.post_id == post.id,
            EmojiReaction.user_id == user.id
        ).first()
        
        if existing_reaction:
            # Update existing reaction
            existing_reaction.emoji = emoji
            db.commit()
            reaction = existing_reaction
        else:
            # Create new reaction
            reaction = EmojiReaction(
                post_id=post.id,
                user_id=user.id,
                emoji=emoji
            )
            db.add(reaction)
            db.commit()
            db.refresh(reaction)
            
            # Create notification for post author (if not self-reaction)
            if str(post.user_id) != str(user.id):
                NotificationService.create_emoji_reaction_notification(
                    db=db,
                    post_author_id=str(post.user_id),
                    reactor_nickname=user.nickname,
                    post_title=post.title,
                    post_id=str(post.id),
                    emoji=emoji
                )
        
        return reaction
    
    @staticmethod
    def remove_emoji_reaction(
        db: Session,
        post: Post,
        user: User
    ) -> bool:
        """Remove user's emoji reaction from post"""
        existing_reaction = db.query(EmojiReaction).filter(
            EmojiReaction.post_id == post.id,
            EmojiReaction.user_id == user.id
        ).first()
        
        if existing_reaction:
            db.delete(existing_reaction)
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def get_post_emoji_reactions(db: Session, post_id: str) -> List[dict]:
        """Get aggregated emoji reactions for a post"""
        reactions = db.query(
            EmojiReaction.emoji,
            func.count(EmojiReaction.id).label('count')
        ).filter(
            EmojiReaction.post_id == post_id
        ).group_by(EmojiReaction.emoji).all()
        
        return [
            {"emoji": reaction.emoji, "count": reaction.count}
            for reaction in reactions
        ]
    
    @staticmethod
    def check_user_empathy(db: Session, post_id: str, user_id: str) -> bool:
        """Check if user has empathized with post"""
        empathy = db.query(Empathy).filter(
            Empathy.post_id == post_id,
            Empathy.user_id == user_id
        ).first()
        
        return empathy is not None