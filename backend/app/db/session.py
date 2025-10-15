# backend/app/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(str(settings.DATABASE_URL)) # str()로 감싸주면 더 안전합니다.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 객체를 여기서 만듭니다.
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()