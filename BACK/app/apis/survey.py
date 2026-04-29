from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_owner
from app.model.survey import Survey, States
from app.schema.survey import SurveyCreate, SurveyCreateResponse, SurveyResponse

router = APIRouter(prefix="/survey", tags=["survey"])

@router.post("/create", response_model=SurveyCreateResponse)
def create_survey(survey_data: SurveyCreate, db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    new_survey = Survey(
        title = survey_data.title,
        description=survey_data.description,
        question=survey_data.question)
    db.add(new_survey)
    db.commit()
    db.refresh(new_survey)
    return new_survey

@router.delete("/{survey_id}")
def delete_survey(survey_id: int, db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    db.delete(survey)
    db.commit()
    return {"message": "Survey deleted successfully"}
@router.get("/{survey_id}")
def get_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


@router.get("/all", response_model=list[SurveyResponse])
def get_all_surveys(limit:int = 20, offset:int = 0, db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    surveys = db.query(Survey).offset(offset).limit(limit).all()
    return [{"id": survey.id, "description": survey.description} for survey in surveys]

@router.get("/active")
def get_active_surveys(db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    surveys = db.query(Survey).filter(Survey.state == States.active).all()
    return [{"id": survey.id, "description": survey.description} for survey in surveys]

@router.get("/draft")
def get_draft_surveys(db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    surveys = db.query(Survey).filter(Survey.state == States.draft).all()
    return [{"id": survey.id, "description": survey.description} for survey in surveys]

@router.get("/close")
def get_close_surveys(db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    surveys = db.query(Survey).filter(Survey.state == States.close).all()
    return [{"id": survey.id, "description": survey.description} for survey in surveys]

