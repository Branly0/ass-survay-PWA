from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, func
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

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    description = Column(Text, nullable=True)
    age_group = Column(Enum(AgeGroups), nullable=True)
    gender = Column(Enum(Genders), nullable=True)
    nationality = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

