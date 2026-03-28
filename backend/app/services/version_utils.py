"""
version_utils.py
Generates build-style version strings: YYYYMMDD.RELEASE_NO
e.g.  20260328.1 → 20260328.2 → 20260328.3 ...
"""
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import DocumentVersion, SectionVersion


async def next_document_version(db: AsyncSession, document_id: str) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"{today}."
    result = await db.execute(
        select(func.count()).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version.like(f"{today}.%"),
        )
    )
    count = result.scalar_one()
    return f"{prefix}{count + 1}"


async def next_section_version(db: AsyncSession, section_id: str) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"{today}."
    result = await db.execute(
        select(func.count()).where(
            SectionVersion.section_id == section_id,
            SectionVersion.version.like(f"{today}.%"),
        )
    )
    count = result.scalar_one()
    return f"{prefix}{count + 1}"
