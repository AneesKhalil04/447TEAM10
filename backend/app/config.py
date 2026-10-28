from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/retriever_essentials"
    secret_key: str = "change-me"
    # Turns on the Testing tab, which can wipe every upload. Only for local demos and development.
    enable_test_tools: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
