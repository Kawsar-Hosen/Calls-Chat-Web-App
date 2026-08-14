from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Xyteee API"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/xyteee"
    jwt_secret: str = "development-secret-change-before-deploy"
    jwt_refresh_secret: str = "development-refresh-secret-change-before-deploy"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"])
    storage_backend: str = "local"
    upload_dir: str = "uploads"
    storage_endpoint: str = ""
    storage_bucket: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_public_url: str = ""
    storage_region: str = "auto"
    max_upload_bytes: int = 5 * 1024 * 1024
    turn_key_id: str = ""
    turn_api_token: str = ""
    giphy_api_key: str = ""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_use_starttls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    fcm_project_id: str = ""
    fcm_credentials_json: str = ""
    fcm_credentials_file: str = ""
    google_client_id: str = ""
    google_android_client_id: str = ""
    google_ios_client_id: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.startswith("["):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value

    @model_validator(mode="after")
    def normalize_database_url(self) -> "Settings":
        if self.database_url.startswith("postgresql://") and not self.database_url.startswith("postgresql+asyncpg://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
