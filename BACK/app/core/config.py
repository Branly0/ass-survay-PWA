from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

class Settings(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    CORS_ORIGIN: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
settings = Settings()
