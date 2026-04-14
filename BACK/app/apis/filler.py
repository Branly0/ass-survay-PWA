from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.model import survey
from app.schema import survey as survey_schema

router = APIRouter(prefix="/filler", tags=["filler"])

@router.get("/")
def get_fillers():
    return {"message": "Get filler data"}

@router.post("/submit", response_model=survey_schema.SurveyResponse)
def submit_survey(survey_data: survey_schema.Surveyfiller, db: Session = Depends(get_db)):
    if survey_data.age_group not in ["child", "teen", "adult", "senior"]:
        raise HTTPException(status_code=400, detail="Invalid age group try [child, teen, adult, senior]")
    if survey_data.gender not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="Invalid gender try [male,female]")
    new_survey = survey.Survey(
        description=survey_data.description,
        age_group=survey_data.age_group,
        gender=survey_data.gender,
        nationality=survey_data.nationality
    )
    db.add(new_survey)
    db.commit()
    db.refresh(new_survey)
    return new_survey