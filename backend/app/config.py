from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/retriever_essentials"
    # Signs login tokens. Must be a long random value anywhere other than a developer's machine.
    secret_key: str = "local-development-only-change-me-before-hosting"
    session_hours: int = 8
    # Hosted deployments serve over HTTPS and need secure=true; a frontend on another domain
    # also needs samesite="none".
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    # Turns on the Testing tab, which can wipe every upload. Only for local demos and development.
    enable_test_tools: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
