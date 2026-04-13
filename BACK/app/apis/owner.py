from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.model.owner import Owner
from app.schema.owner import OwnerCreate, OwnerLogin, OwnerResponse
from app.db.session import get_db

router = APIRouter(prefix="/owner",tags=["owner"])

@router.post("/register", response_model=OwnerResponse)
def register_owner(owner: OwnerCreate, db: Session = Depends(get_db)):
    #check owner already exists
    existing_owner = db.query(Owner).filter(Owner.email == owner.email).first()
    if existing_owner:
        raise HTTPException(status_code=400, detail="Owner with this email already exists")