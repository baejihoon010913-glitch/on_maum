from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from uuid import UUID
import time

from app.db.session import get_db
from app.core.security import get_current_active_user
from app.schemas.post import Post, PostCreate, PostUpdate, PostEmpathyResponse
from app.models.user import User
from app.services.post_service import PostService

router = APIRouter()


@router.get("/", response_model=dict)
def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get posts list (public posts and user's private posts)
    """
    post_service = PostService(db)
    posts, total = post_service.get_posts(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category=category
    )
    
    return {
        "items": [Post.from_orm(post) for post in posts],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/", response_model=Post)
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new post
    """
    post_service = PostService(db)
    
    try:
        post = post_service.create_post(
            user_id=current_user.id,
            post_data=post_data
        )
        return Post.from_orm(post)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create post"
        )


@router.get("/search", response_model=dict)
def search_posts(
    q: str = Query(..., min_length=2, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    sort_by: str = Query("relevance", regex="^(relevance|created_at|empathy_count)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Search posts by keyword using Full-Text Search functionality
    """
    post_service = PostService(db)
    
    start_time = time.time()
    
    try:
        posts, total = post_service.search_posts(
            search_query=q.strip(),
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )
        
        search_time = time.time() - start_time
        
        return {
            "items": [Post.from_orm(post) for post in posts],
            "total": total,
            "query": q,
            "search_time": round(search_time, 3),
            "skip": skip,
            "limit": limit,
            "sort_by": sort_by
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search functionality temporarily unavailable"
        )


@router.get("/my", response_model=dict)
def get_my_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get user's posts (including private ones)
    """
    post_service = PostService(db)
    posts, total = post_service.get_user_posts(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return {
        "items": [Post.from_orm(post) for post in posts],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{post_id}", response_model=Post)
def get_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get post details
    """
    post_service = PostService(db)
    
    try:
        post_uuid = UUID(post_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid post ID format"
        )
    
    post = post_service.get_post_by_id(
        post_id=post_uuid,
        user_id=current_user.id
    )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or access denied"
        )
    
    return Post.from_orm(post)


@router.put("/{post_id}", response_model=Post)
def update_post(
    post_id: str,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a post
    """
    post_service = PostService(db)
    
    try:
        post_uuid = UUID(post_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid post ID format"
        )
    
    try:
        post = post_service.update_post(
            post_id=post_uuid,
            user_id=current_user.id,
            post_data=post_data
        )
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found or access denied"
            )
        
        return Post.from_orm(post)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update post"
        )


@router.delete("/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a post
    """
    post_service = PostService(db)
    
    try:
        post_uuid = UUID(post_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid post ID format"
        )
    
    success = post_service.delete_post(
        post_id=post_uuid,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or access denied"
        )
    
    return {"message": "Post has been deleted successfully."}


@router.post("/{post_id}/empathy", response_model=PostEmpathyResponse)
def toggle_empathy(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Toggle empathy for a post (database transaction applied for data integrity)
    """
    post_service = PostService(db)
    
    try:
        post_uuid = UUID(post_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid post ID format"
        )
    
    try:
        result = post_service.toggle_empathy(
            post_id=post_uuid,
            user_id=current_user.id
        )
        
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        empathized, empathy_count = result
        
        return PostEmpathyResponse(
            empathized=empathized,
            empathy_count=empathy_count,
            message="Empathy toggled successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle empathy"
        )