from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update, delete as sa_delete
from typing import Optional, List
from slugify import slugify
from app.models.models import Section, Document
from app.schemas.section import SectionCreate, SectionUpdate


async def create(db: AsyncSession, data: SectionCreate) -> Section:
    slug = data.slug or slugify(data.title)
    section = Section(title=data.title, slug=slug, description=data.description, parent_id=data.parent_id, order=data.order)
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


async def get(db: AsyncSession, section_id: str) -> Optional[Section]:
    result = await db.execute(select(Section).where(Section.id == section_id))
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> Optional[Section]:
    result = await db.execute(select(Section).where(Section.slug == slug))
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession) -> List[Section]:
    result = await db.execute(select(Section).order_by(Section.order, Section.created_at))
    return list(result.scalars().all())


async def update(db: AsyncSession, section_id: str, data: SectionUpdate) -> Optional[Section]:
    section = await get(db, section_id)
    if not section:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return section


async def delete(db: AsyncSession, section_id: str) -> bool:
    section = await get(db, section_id)
    if not section:
        return False
    # Explicitly delete documents — async SQLAlchemy does not lazy-load
    # the relationship, so ORM cascade never fires without this.
    await db.execute(sa_delete(Document).where(Document.section_id == section_id))
    # Detach any child sections so they become top-level (not orphaned)
    await db.execute(
        sa_update(Section).where(Section.parent_id == section_id).values(parent_id=None)
    )
    await db.delete(section)
    await db.commit()
    return True


async def reorder(db: AsyncSession, ids: List[str]) -> None:
    for i, section_id in enumerate(ids):
        await db.execute(sa_update(Section).where(Section.id == section_id).values(order=i))
    await db.commit()
