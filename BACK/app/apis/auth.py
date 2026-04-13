from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.model.owner import Owner
from app.schema.owner import OwnerCreate, OwnerLogin, OwnerResponse
from app.db.session import get_db
from app.core.security import HashPassword, VerifyPassword, CreateAccessToken, CreateRefreshToken
from uuid import uuid4

router = APIRouter(prefix="/owner",tags=["owner"])

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