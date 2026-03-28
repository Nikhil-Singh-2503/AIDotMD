import pytest
import pytest_asyncio
from app.schemas.section import SectionCreate
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services import section_service, document_service


@pytest_asyncio.fixture
async def section(db_session):
    return await section_service.create(db_session, SectionCreate(title="Guide"))


@pytest.mark.asyncio
async def test_create_document(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    doc = await document_service.create(
        db_session,
        DocumentCreate(title="Installation", section_id=section.id, content="# Install"),
    )
    assert doc.id is not None
    assert doc.slug == "installation"
    document_service._storage = None


@pytest.mark.asyncio
async def test_create_document_auto_slug(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    doc = await document_service.create(
        db_session, DocumentCreate(title="Quick Start Guide", section_id=section.id)
    )
    assert doc.slug == "quick-start-guide"
    document_service._storage = None


@pytest.mark.asyncio
async def test_list_documents_by_section(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    await document_service.create(db_session, DocumentCreate(title="A", section_id=section.id, order=1))
    await document_service.create(db_session, DocumentCreate(title="B", section_id=section.id, order=0))
    docs = await document_service.list_by_section(db_session, section.id)
    assert docs[0].title == "B"
    assert docs[1].title == "A"
    document_service._storage = None


@pytest.mark.asyncio
async def test_update_document(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    doc = await document_service.create(db_session, DocumentCreate(title="Old", section_id=section.id))
    updated = await document_service.update(db_session, doc.id, DocumentUpdate(title="New", content="# New"))
    assert updated.title == "New"
    assert updated.content == "# New"
    document_service._storage = None


@pytest.mark.asyncio
async def test_delete_document(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    doc = await document_service.create(db_session, DocumentCreate(title="Del", section_id=section.id))
    await document_service.delete(db_session, doc.id)
    result = await document_service.get(db_session, doc.id)
    assert result is None
    document_service._storage = None


@pytest.mark.asyncio
async def test_reorder_documents(db_session, section, tmp_path):
    document_service._storage = __import__('app.storage.filesystem', fromlist=['FilesystemStorage']).FilesystemStorage(
        docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static")
    )
    d1 = await document_service.create(db_session, DocumentCreate(title="First", section_id=section.id, order=0))
    d2 = await document_service.create(db_session, DocumentCreate(title="Second", section_id=section.id, order=1))
    await document_service.reorder(db_session, section.id, [d2.id, d1.id])
    docs = await document_service.list_by_section(db_session, section.id)
    assert docs[0].id == d2.id
    document_service._storage = None
