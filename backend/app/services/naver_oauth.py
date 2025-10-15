import httpx
from typing import Optional, Dict, Any
from app.core.config import settings


class NaverOAuthService:
    """Naver OAuth service for handling OAuth authentication"""
    
    NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
    NAVER_USER_INFO_URL = "https://openapi.naver.com/v1/nid/me"
    
    @classmethod
    async def get_access_token(cls, code: str, state: str) -> Optional[str]:
        """Get access token from Naver OAuth"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    cls.NAVER_TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "client_id": settings.NAVER_CLIENT_ID,
                        "client_secret": settings.NAVER_CLIENT_SECRET,
                        "code": code,
                        "state": state,
                        "redirect_uri": settings.NAVER_REDIRECT_URI
                    }
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    return token_data.get("access_token")
                    
        except Exception as e:
            print(f"Error getting Naver access token: {e}")
            
        return None
    
    @classmethod
    async def get_user_info(cls, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Naver API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    cls.NAVER_USER_INFO_URL,
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    if user_data.get("resultcode") == "00":
                        return user_data.get("response")
                        
        except Exception as e:
            print(f"Error getting Naver user info: {e}")
            
        return None
    
    @classmethod
    async def verify_user(cls, code: str, state: str) -> Optional[Dict[str, Any]]:
        """Complete OAuth flow - get token and user info"""
        access_token = await cls.get_access_token(code, state)
        if not access_token:
            return None
            
        user_info = await cls.get_user_info(access_token)
        if not user_info:
            return None
            
        # Format user info according to our needs
        return {
            "provider": "naver",
            "sns_id": user_info.get("id"),
            "email": user_info.get("email"),
            "name": user_info.get("name") or user_info.get("nickname"),
            "profile_image": user_info.get("profile_image"),
        }