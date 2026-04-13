from sqlalchemy import Column, Integer, String, Text, Enum
from app.db.session import Base
import enum

class AgeGroup(enum.Enum):
    CHILD = "child"
    TEEN = "teen"
    ADULT = "adult"
    SENIOR = "senior"

class Gender(enum.Enum):
    MALE = "male"
    FEMALE = "female"

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    age_group = Column(Enum(AgeGroup), nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    nationality = Column(String(50), nullable=True)

