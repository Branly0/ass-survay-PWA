from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum, datetime

class AgeGroups(enum.Enum):
    child = "child"
    teen = "teen"
    adult = "adult"
    senior = "senior"

class Genders(enum.Enum):
    male = "male"
    female = "female"

class States(enum.Enum):
    draft = "draft"
    active = "active"
    close = "close"


class Survey(Base):
    __tablename__ = "surveys"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    question = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    state = Column(Enum(States), default=States.active,  nullable=False)
    response = relationship("Response", back_populates="survey", cascade="all, delete-orphan")


class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    age_group = Column(Enum(AgeGroups), nullable=False)
    nationality = Column(String(100), nullable=False)
    gender = Column(Enum(Genders), nullable=False)
    answers = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    survey = relationship("Survey", back_populates="response")

