from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def _engine_url() -> str:
    if settings.sqlite_fallback or settings.database_url.startswith("postgres") is False:
        return "sqlite:///./shopverse.db"
    url = settings.database_url
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


engine = create_engine(_engine_url(), pool_pre_ping=True, connect_args={"check_same_thread": False} if "sqlite" in _engine_url() else {})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()