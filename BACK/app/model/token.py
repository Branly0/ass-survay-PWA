from sqlalchemy import Column, Integer, Boolean, DateTime, String, func,Uuid, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True,autoincrement=True)
    owner_id = Column(Uuid, ForeignKey("owners.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    owner = relationship("Owner", back_populates="tokens")