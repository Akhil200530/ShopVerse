import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ShopVerse API"
    version: str = "1.0.0"

    secret_key: str = os.getenv("SECRET_KEY", "shopverse-dev-secret-change-me-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://shopverse:shopverse@localhost:5432/shopverse",
    )
    sqlite_fallback: bool = os.getenv("SQLITE_FALLBACK", "1") == "1"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:8080",
    ]

    # Stripe (card payments). Leave unset to run COD-only or sandbox mode.
    stripe_secret_key: str = os.getenv("STRIPE_SECRET_KEY", "")
    stripe_public_key: str = os.getenv("STRIPE_PUBLIC_KEY", "")
    stripe_webhook_secret: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    stripe_currency: str = os.getenv("STRIPE_CURRENCY", "inr").lower()
    stripe_success_url: str = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:8080/orders?reference={CHECKOUT_SESSION_ID}&stripe=1")
    stripe_cancel_url: str = os.getenv("STRIPE_CANCEL_URL", "http://localhost:8080/cart")

    class Config:
        env_file = ".env"


settings = Settings()