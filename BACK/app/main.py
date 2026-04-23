from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.apis import auth as auth_router
from app.apis import filler as filler_router
from app.apis import survey as survey_router


from app.core.security import get_current_owner



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers=["*"]
)

app.include_router(auth_router.router)
app.include_router(filler_router.router)
app.include_router(survey_router.router)

@app.get("/")
def read_root():
    return {"Hello": "World"}
@app.get("/health")
def health_check(get_current_owner: dict = Depends(get_current_owner)):
    return {"status": "ok"}