from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/mouse_db"
    SECRET_KEY: str = "change-me-in-production-at-least-32-characters-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "../uploads"
    MAX_FILE_SIZE_MB: int = 50
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

    @property
    def database_url_sync(self) -> str:
        """
        Railway отдаёт DATABASE_URL в виде postgres:// или postgresql://.
        SQLAlchemy требует postgresql+psycopg2://.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
