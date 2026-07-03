from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LoShare API"
    app_version: str = "1.0.0"
    app_env: str = Field(default="dev")

    database_url: str = "sqlite+aiosqlite:///./loshare.db"

    smtp_host: str = "smtp.qq.com"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_timeout: int = 20

    frontend_origin: str = "http://localhost:5000"

    enforce_https: bool = False
    trusted_proxy_headers: bool = True

    livekit_ws_url: str = "ws://localhost:7880"
    livekit_api_url: str = "http://localhost:7880"
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"

    log_level: str = "INFO"

    rate_limit_send_code: str = "5/minute"
    rate_limit_login: str = "10/minute"
    rate_limit_register: str = "5/minute"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()