from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./aidotmd.db"
    STORAGE_BACKEND: str = "filesystem"  # "filesystem" | "s3"
    DOCS_OUTPUT_DIR: str = "./data/docs"
    STATIC_DIR: str = "./data/static/img"
    DATA_DIR: str = "./data"
    BASE_URL: str = "http://localhost:8000"
    USE_PUBLIC_URL: bool = False
    # Comma-separated list of allowed CORS origins
    CORS_ORIGINS: str = "http://localhost:5173"

    # S3 / R2 storage (optional)
    S3_BUCKET: str = ""
    S3_REGION: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str = ""  # for R2/MinIO custom endpoints

    # MCP API key (auto-generated on first startup, stored in data/aidotmd.config.json)
    MCP_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
