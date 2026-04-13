# manage password hashing 
from passlib import context as passlib_context

pwd_context = passlib_context.CryptContext(schemes=["argon2"], deprecated="auto")

def HashPassword(password: str) -> str:
    return pwd_context.hash(password)

def VerifyPassword(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT token generation and verification

from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings

secure_key = settings.SECURE_KEY
algorithm = settings.ALGORITHM
access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

def CreateAccessToken(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=access_token_expire_minutes)
    to_encode.update({"type": "access", "exp": expire})
    encoded_jwt = jwt.encode(to_encode, secure_key, algorithm=algorithm)
    return encoded_jwt

def CreateRefreshToken(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=refresh_token_expire_days)
    to_encode.update({"type": "refresh", "exp": expire})
    encoded_jwt = jwt.encode(to_encode, secure_key, algorithm=algorithm)