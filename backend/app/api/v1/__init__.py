from fastapi import APIRouter

from .auth import router as auth_router
from .chat import router as chat_router
from .posts import router as posts_router
from .diaries import router as diaries_router
from .counselors import router as counselors_router
from .notifications import router as notifications_router
from .upload import router as upload_router
from .staff import router as staff_router
from .admin import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
api_router.include_router(posts_router, prefix="/posts", tags=["Posts"])
api_router.include_router(diaries_router, prefix="/diaries", tags=["Diaries"])
api_router.include_router(counselors_router, prefix="/counselors", tags=["Counselors"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(upload_router, prefix="/upload", tags=["Upload"])
api_router.include_router(staff_router, tags=["Staff"])
api_router.include_router(admin_router, tags=["Admin"])