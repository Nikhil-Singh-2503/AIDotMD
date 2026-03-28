import pytest
import pytest_asyncio
from app.schemas.section import SectionCreate
from app.schemas.document import DocumentCreate
from app.services import section_service, document_service, nav_service
from app.storage.filesystem import FilesystemStorage


@pytest_asyncio.fixture
async def storage(tmp_path):
    s = FilesystemStorage(docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static"))
    document_service._storage = s
    yield s
    document_service._storage = None


@pytest.mark.asyncio
async def test_get_tree_structure(db_session, storage):
    s = await section_service.create(db_session, SectionCreate(title="Guide", order=0))
    await document_service.create(db_session, DocumentCreate(title="Intro", section_id=s.id, order=0))
    await document_service.create(db_session, DocumentCreate(title="Setup", section_id=s.id, order=1))
    tree = await nav_service.get_tree(db_session)
    assert len(tree) == 1
    assert tree[0]["title"] == "Guide"
    assert len(tree[0]["documents"]) == 2
    assert tree[0]["documents"][0]["title"] == "Intro"


@pytest.mark.asyncio
async def test_get_sidebar_config(db_session, storage):
    s = await section_service.create(db_session, SectionCreate(title="API", order=0))
    await document_service.create(db_session, DocumentCreate(title="Overview", section_id=s.id, order=0))
    config = await nav_service.get_sidebar_config(db_session)
    assert "docs" in config
    assert config["docs"][0]["label"] == "API"
