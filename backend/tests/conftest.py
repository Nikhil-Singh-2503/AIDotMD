import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.db import Base, get_db
from app.storage.filesystem import FilesystemStorage


@pytest_asyncio.fixture
async def db_session(tmp_path):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session, tmp_path):
    from app.main import app
    from app.services import document_service

    async def override_get_db():
        yield db_session

    storage = FilesystemStorage(
        docs_dir=str(tmp_path / "docs"),
        static_dir=str(tmp_path / "static"),
        base_url="http://testserver"
    )
    document_service._storage = storage

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    document_service._storage = None
