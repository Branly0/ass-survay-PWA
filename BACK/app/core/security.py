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
    return encoded_jwt

def refresh_access_token(refresh_token: str) -> str:
    try:
        payload = jwt.decode(refresh_token, secure_key, algorithms=[algorithm])
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        email: str = payload.get("sub")

        #for the refresh check, we can also verify if the token exists in the database and is valid (not revoked)
        from app.db.session import SessionLocal
        from app.model.token import Token
        db = SessionLocal()
        token = db.query(Token).filter(Token.token == refresh_token).first()

        if token.is_revoked:
            raise ValueError("Token has been revoked, you are logged out")

        if email is None:
            raise ValueError("Invalid token")
        return CreateAccessToken(data={"sub": email})
    except jwt.JWTError:
        raise ValueError("Invalid token")
    
def AuthenticateOwner(email: str, password: str) -> bool:
    from app.db.session import SessionLocal
    from app.model.owner import Owner
    db = SessionLocal()
    owner = db.query(Owner).filter(Owner.email == email).first()
    if not owner:
        return False
    if not VerifyPassword(password, owner.hashed_password):
        return False
    return True