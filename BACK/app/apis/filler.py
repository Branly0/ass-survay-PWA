from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import json
from sqlalchemy.orm import Session
from app.core.security import get_current_owner
from app.db.session import get_db
from app.model import survey
from app.schema import survey as survey_schema

router = APIRouter(prefix="/filler", tags=["filler"])

connected_owner: list[WebSocket] = []

@router.get("/responses/{survey_id}", response_model=list[survey_schema.SurveyFillerResponse])
def get_all_fillers(survey_id: int, limit: int = 50, offset: int = 0, db: Session = Depends(get_db), get_current_owner = Depends(get_current_owner)):
    fillers = db.query(survey.Response).filter(survey.Response.survey_id == survey_id).limit(limit).offset(offset).all()
    return fillers

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_owner.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_owner.remove(websocket)

@router.get("/")
def get_fillers():
    return {"message": "Get filler data"}

@router.get("/{filler_id}")
def get_filler(filler_id: int, db: Session = Depends(get_db)):
    filler = db.query(survey.Response).filter(survey.Response.id == filler_id).first()
    if not filler:
        raise HTTPException(status_code=404, detail="Filler not found")
    return filler

@router.post("/submit/{surveys_id}", response_model=survey_schema.SurveyFillerResponse)
async def submit_survey(survey_data: survey_schema.Surveyfiller, surveys_id:int, db: Session = Depends(get_db)):
    if survey_data.age_group not in ["child", "teen", "adult", "senior"]:
        raise HTTPException(status_code=400, detail="Invalid age group try [child, teen, adult, senior]")
    if survey_data.gender not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="Invalid gender try [male,female]")
    new_survey = survey.Response(
        survey_id=surveys_id,
        age_group=survey_data.age_group,
        answers=survey_data.answers,
        gender=survey_data.gender,
        nationality=survey_data.nationality 
    )
    db.add(new_survey)
    db.commit()
    db.refresh(new_survey)
    return new_survey

