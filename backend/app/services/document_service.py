from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update
from typing import Optional, List
from slugify import slugify
from app.models.models import Document, DocumentVersion, utcnow
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.storage.filesystem import FilesystemStorage
from app.config import get_settings
from app.services.version_utils import next_document_version

# Module-level storage instance (overrideable in tests)
_storage: Optional[FilesystemStorage] = None


def get_storage() -> FilesystemStorage:
    global _storage
    if _storage is None:
        s = get_settings()
        _storage = FilesystemStorage(
            docs_dir=s.DOCS_OUTPUT_DIR,
            static_dir=s.STATIC_DIR,
            base_url=s.BASE_URL,
        )
    return _storage


async def _snapshot(db: AsyncSession, doc: Document) -> None:
    """Save a version snapshot of the current document state."""
    ver = await next_document_version(db, doc.id)
    doc.version = ver
    snapshot = DocumentVersion(
        document_id=doc.id,
        version=ver,
        title=doc.title,
        description=doc.description,
        section_id=doc.section_id,
        slug=doc.slug,
        content=doc.content,
        order=doc.order,
        is_published=doc.is_published,
    )
    db.add(snapshot)


async def create(db: AsyncSession, data: DocumentCreate) -> Document:
    slug = data.slug or slugify(data.title)
    doc = Document(
        title=data.title, description=data.description, section_id=data.section_id,
        slug=slug, content=data.content, order=data.order,
        is_published=data.is_published,
    )
    db.add(doc)
    await db.flush()           # get doc.id before snapshotting
    await _snapshot(db, doc)
    await db.commit()
    await db.refresh(doc)
    # Sync to filesystem
    from app.services.section_service import get as get_section
    section = await get_section(db, data.section_id)
    if section:
        await get_storage().write_document(section.slug, slug, data.content, title=data.title, order=data.order)
    return doc


async def get(db: AsyncSession, doc_id: str) -> Optional[Document]:
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, section_slug: str, doc_slug: str) -> Optional[Document]:
    from app.services.section_service import get_by_slug as get_section_by_slug
    section = await get_section_by_slug(db, section_slug)
    if not section:
        return None
    result = await db.execute(
        select(Document).where(
            Document.section_id == section.id,
            Document.slug == doc_slug,
            Document.is_published == True,
            Document.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession) -> List[Document]:
    result = await db.execute(select(Document).where(Document.deleted_at.is_(None)).order_by(Document.order, Document.created_at))
    return list(result.scalars().all())


async def list_by_section(db: AsyncSession, section_id: str) -> List[Document]:
    result = await db.execute(
        select(Document).where(Document.section_id == section_id, Document.deleted_at.is_(None)).order_by(Document.order, Document.created_at)
    )
    return list(result.scalars().all())


async def list_published(db: AsyncSession) -> List[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.is_published == True, Document.deleted_at.is_(None))
        .order_by(Document.order, Document.created_at)
    )
    return list(result.scalars().all())


async def update(db: AsyncSession, doc_id: str, data: DocumentUpdate) -> Optional[Document]:
    doc = await get(db, doc_id)
    if not doc:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(doc, field, value)
    await _snapshot(db, doc)
    await db.commit()
    await db.refresh(doc)
    # Re-sync filesystem
    from app.services.section_service import get as get_section
    section = await get_section(db, doc.section_id)
    if section:
        await get_storage().write_document(section.slug, doc.slug, doc.content, title=doc.title, order=doc.order)
    return doc


async def delete(db: AsyncSession, doc_id: str) -> bool:
    doc = await get(db, doc_id)
    if not doc:
        return False
    from app.services.section_service import get as get_section
    section = await get_section(db, doc.section_id)
    if section:
        await get_storage().delete_document(section.slug, doc.slug)
    doc.deleted_at = utcnow()
    await db.commit()
    return True


async def reorder(db: AsyncSession, section_id: str, ids: List[str]) -> None:
    for i, doc_id in enumerate(ids):
        await db.execute(
            sa_update(Document).where(Document.id == doc_id, Document.section_id == section_id).values(order=i)
        )
    await db.commit()


async def list_versions(db: AsyncSession, doc_id: str) -> List[DocumentVersion]:
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.created_at.desc())
    )
    return list(result.scalars().all())


async def restore_version(db: AsyncSession, doc_id: str, version_id: str) -> Optional[Document]:
    """Restore a document to a past version snapshot (creates a new version entry)."""
    snap_result = await db.execute(
        select(DocumentVersion).where(DocumentVersion.id == version_id, DocumentVersion.document_id == doc_id)
    )
    snap = snap_result.scalar_one_or_none()
    if not snap:
        return None
    doc = await get(db, doc_id)
    if not doc:
        return None
    doc.title = snap.title
    doc.description = snap.description
    doc.slug = snap.slug
    doc.content = snap.content
    doc.order = snap.order
    doc.is_published = snap.is_published
    doc.section_id = snap.section_id
    await _snapshot(db, doc)
    await db.commit()
    await db.refresh(doc)
    from app.services.section_service import get as get_section
    section = await get_section(db, doc.section_id)
    if section:
        await get_storage().write_document(section.slug, doc.slug, doc.content, title=doc.title, order=doc.order)
    return doc
