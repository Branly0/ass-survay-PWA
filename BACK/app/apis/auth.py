from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
from app.model.owner import Owner
from app.model.token import Token
from app.schema.owner import OwnerCreate, OwnerLogin, OwnerResponse
from app.db.session import get_db
from app.core.security import CreateRefreshToken, HashPassword,get_current_owner, VerifyPassword, CreateAccessToken, CreateRefreshToken, refresh_access_token, AuthenticateOwner
from app.core.config import settings
from uuid import uuid4

from fastapi.security import OAuth2PasswordRequestForm

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
    return OwnerResponse(email=db_owner.email, access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=OwnerResponse)
def login_owner(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = AuthenticateOwner(form_data.username, form_data.password)
   

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    access_token = CreateAccessToken(data={"sub": user.email})
    refresh_token = CreateRefreshToken(data={"sub": user.email})
    new_token = Token(
        owner_id = user.id,
        token = refresh_token
    )
    db.add(new_token)
    db.commit()
    return OwnerResponse(email=user.email, access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        new_access_token = refresh_access_token(refresh_token)
        return {"access_token": new_access_token, "token_type": "bearer"}
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