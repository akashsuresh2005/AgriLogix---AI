"""
config.py — Application Settings
Uses environment variables with sensible defaults for local development.
"""

import os
from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    # Default: SQLite (zero setup, works immediately)
    # For production: set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postharvest_db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./postharvest.db")

    # ── JWT Authentication ────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bit-major-project-2023-27-super-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── API Keys (loaded from .env or environment) ─────────────────────────
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    MARKET_API_KEY: str = os.getenv("MARKET_API_KEY", "")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
