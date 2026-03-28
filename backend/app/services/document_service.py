from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update
from typing import Optional, List
from slugify import slugify
from app.models.models import Document, utcnow
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.storage.filesystem import FilesystemStorage
from app.config import get_settings

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


async def create(db: AsyncSession, data: DocumentCreate) -> Document:
    slug = data.slug or slugify(data.title)
    doc = Document(
        title=data.title, description=data.description, section_id=data.section_id,
        slug=slug, content=data.content, order=data.order,
        is_published=data.is_published,
    )
    db.add(doc)
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
