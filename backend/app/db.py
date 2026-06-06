from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _enable_fks(dbapi_connection, connection_record):
    """Enable foreign key enforcement on SQLite connections."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


def create_engine_and_session():
    settings = get_settings()
    extra = {}
    if settings.DATABASE_URL.startswith("sqlite"):
        extra["connect_args"] = {"check_same_thread": False}
    engine = create_async_engine(settings.DATABASE_URL, echo=False, **extra)
    event.listen(engine.sync_engine, "connect", _enable_fks)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    return engine, SessionLocal


engine, SessionLocal = create_engine_and_session()


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
