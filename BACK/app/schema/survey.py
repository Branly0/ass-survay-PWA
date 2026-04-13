from pydantic import BaseModel
import datetime



class Surveyfiller(BaseModel):

    description: str
    age_group: str
    gender: str 
    nationality: str 

class SurveyResponse(Surveyfiller):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True