from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
from app.model.owner import Owner
from app.schema.owner import OwnerCreate, OwnerLogin, OwnerResponse
from app.db.session import get_db
from app.core.security import CreateRefreshToken, HashPassword,get_current_owner, VerifyPassword, CreateAccessToken, CreateRefreshToken, refresh_access_token
from app.core.config import settings
from uuid import uuid4

router = APIRouter(prefix="/auth",tags=["auth"])

@router.post("/register", response_model=OwnerResponse)
def register_owner(owner: OwnerCreate, db: Session = Depends(get_db)):
    #check owner already exists
    existing_owner = db.query(Owner).filter(Owner.email == owner.email).first()
    if existing_owner:
        raise HTTPException(status_code=400, detail="Owner with this email already exists")
    
    #hash the password
    hashed_password = HashPassword(owner.password)

    #token generation
    access_token = CreateAccessToken(data={"sub": owner.email})
    refresh_token = CreateRefreshToken(data={"sub": owner.email})
    #create the owner
    db_owner = Owner(
        id = uuid4(),
        name=owner.name,
        email=owner.email,
        password_hash=hashed_password
    )
    db.add(db_owner) 
    db.commit()
    db.refresh(db_owner)
    return OwnerResponse(id=db_owner.id, access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=OwnerResponse)
def login_owner(owner: OwnerLogin, db: Session = Depends(get_db)):
    #check if owner exists
    db_owner = db.query(Owner).filter(Owner.email == owner.email).first()
    if not db_owner:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    #verify the password
    if not VerifyPassword(owner.password, db_owner.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    #token generation
    access_token = CreateAccessToken(data={"sub": db_owner.email})
    refresh_token = CreateRefreshToken(data={"sub": db_owner.email})

    return OwnerResponse(email=db_owner.email, access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=OwnerResponse)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        new_access_token = refresh_access_token(refresh_token)
        return OwnerResponse(access_token=new_access_token, refresh_token=refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logout")
def logout_owner(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise ValueError("Invalid token")

        #revoke the token in the database
        from app.model.token import Token
        token = db.query(Token).filter(Token.token == refresh_token).first()
        if token:
            token.is_revoked = True
            db.commit()
        return {"message": "Logged out successfully"}
    except jwt.JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

@router.get("/me")
def get_current_owner_info(current_owner_email: str = Depends(get_current_owner), db: Session = Depends(get_db)):
    db_owner = db.query(Owner).filter(Owner.email == current_owner_email).first()
    if not db_owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return True