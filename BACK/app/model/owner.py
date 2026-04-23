from sqlalchemy import Column, Integer, String, DateTime, Uuid,func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Owner(Base):
    __tablename__ = "owners"

    id = Column(Uuid, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    tokens = relationship("Token", back_populates="owner", cascade="all, delete-orphan")