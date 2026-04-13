from sqlalchemy import Column, Integer, String, DateTime, Uuid,func
from app.db.session import Base

class Owner(Base):
    __tablename__ = "owners"

    id = Column(Uuid(as_uuid=True), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)