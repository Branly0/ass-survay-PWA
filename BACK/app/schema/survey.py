from pydantic import BaseModel
from datetime import datetime
from typing import List
import json

class SurveyCreate(BaseModel):
    title: str
    description: str
    question: List[dict]

class Surveyfiller(BaseModel):
    age_group: str
    gender: str 
    answers: List[dict]
    nationality: str 

class SurveyFillerResponse(Surveyfiller):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SurveyCreateResponse(SurveyCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SurveyResponse(BaseModel):
    id: int
    description: str

    class Config:
        from_attributes = True
