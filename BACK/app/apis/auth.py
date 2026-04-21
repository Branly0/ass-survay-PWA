from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.model.owner import Owner
from app.schema.owner import OwnerCreate, OwnerLogin, OwnerResponse
from app.db.session import get_db
from app.core.security import HashPassword, VerifyPassword, CreateAccessToken, CreateRefreshToken
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

    return OwnerResponse(id=db_owner.id, access_token=access_token, refresh_token=refresh_token)