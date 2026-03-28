from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update
from typing import Optional, List
from slugify import slugify
from app.models.models import Section, SectionVersion, Document, utcnow
from app.schemas.section import SectionCreate, SectionUpdate
from app.services.version_utils import next_section_version


async def _snapshot(db: AsyncSession, section: Section) -> None:
    """Save a version snapshot of the current section state."""
    ver = await next_section_version(db, section.id)
    section.version = ver
    snapshot = SectionVersion(
        section_id=section.id,
        version=ver,
        title=section.title,
        slug=section.slug,
        description=section.description,
        parent_id=section.parent_id,
        order=section.order,
    )
    db.add(snapshot)


async def create(db: AsyncSession, data: SectionCreate) -> Section:
    slug = data.slug or slugify(data.title)
    section = Section(title=data.title, slug=slug, description=data.description, parent_id=data.parent_id, order=data.order)
    db.add(section)
    await db.flush()          # get section.id before snapshotting
    await _snapshot(db, section)
    await db.commit()
    await db.refresh(section)
    return section


async def get(db: AsyncSession, section_id: str) -> Optional[Section]:
    result = await db.execute(select(Section).where(Section.id == section_id, Section.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Section]:
    result = await db.execute(select(Section).where(Section.slug == slug, Section.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession) -> List[Section]:
    result = await db.execute(select(Section).where(Section.deleted_at.is_(None)).order_by(Section.order, Section.created_at))
    return list(result.scalars().all())


async def update(db: AsyncSession, section_id: str, data: SectionUpdate) -> Optional[Section]:
    section = await get(db, section_id)
    if not section:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(section, field, value)
    await _snapshot(db, section)
    await db.commit()
    await db.refresh(section)
    return section


async def delete(db: AsyncSession, section_id: str) -> bool:
    section = await get(db, section_id)
    if not section:
        return False
    now = utcnow()
    doc_result = await db.execute(select(Document).where(Document.section_id == section_id, Document.deleted_at.is_(None)))
    docs = doc_result.scalars().all()

    from app.services.document_service import get_storage
    storage = get_storage()
    for doc in docs:
        await storage.delete_document(section.slug, doc.slug)
        doc.deleted_at = now

    await db.execute(
        sa_update(Section).where(Section.parent_id == section_id).values(parent_id=None)
    )
    section.deleted_at = now
    await db.commit()
    return True


async def reorder(db: AsyncSession, ids: List[str]) -> None:
    for i, section_id in enumerate(ids):
        await db.execute(sa_update(Section).where(Section.id == section_id).values(order=i))
    await db.commit()


async def list_versions(db: AsyncSession, section_id: str) -> List[SectionVersion]:
    result = await db.execute(
        select(SectionVersion)
        .where(SectionVersion.section_id == section_id)
        .order_by(SectionVersion.created_at.desc())
    )
    return list(result.scalars().all())


async def restore_version(db: AsyncSession, section_id: str, version_id: str) -> Optional[Section]:
    """Restore a section to a past version snapshot (creates a new version entry)."""
    snap_result = await db.execute(
        select(SectionVersion).where(SectionVersion.id == version_id, SectionVersion.section_id == section_id)
    )
    snap = snap_result.scalar_one_or_none()
    if not snap:
        return None
    section = await get(db, section_id)
    if not section:
        return None
    section.title = snap.title
    section.slug = snap.slug
    section.description = snap.description
    section.parent_id = snap.parent_id
    section.order = snap.order
    await _snapshot(db, section)
    await db.commit()
    await db.refresh(section)
    return section
