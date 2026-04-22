from pydantic import BaseModel, EmailStr, UUID4

class OwnerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class OwnerLogin(BaseModel):
    email: EmailStr
    password: str

class OwnerResponse(BaseModel):
    email: EmailStr
    access_token: str
    refresh_token: str

    class Config:
        from_attributes = True