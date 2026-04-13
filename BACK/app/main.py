from fastapi import FastAPI

from app.apis import auth as auth_router



app = FastAPI()
app.include_router(auth_router.router)

@app.get("/")
def read_root():
    return {"Hello": "World"}