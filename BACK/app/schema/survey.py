from pydantic import BaseModel, json
from datetime import datetime
from typing import List



class Surveyfiller(BaseModel):

    description: str
    age_group: str
    gender: str 
    questions: json
    nationality: str 

class SurveyResponse(Surveyfiller):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True