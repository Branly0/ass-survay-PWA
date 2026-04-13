from pydantic import BaseModel

class OwnerCreate(BaseModel):
    name: str
    email: str
    password: str

class OwnerLogin(BaseModel):
    email: str
    password: str

class OwnerResponse(BaseModel):
    id: str
    access_token: str
    refresh_token: str

    class Config:
        from_attributes = True