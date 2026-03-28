from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db import get_db
from app.schemas.section import SectionCreate, SectionUpdate, SectionOut, SectionVersionOut, ReorderRequest
from app.services import section_service

router = APIRouter(prefix="/api/v1/sections", tags=["sections"])


@router.post("", response_model=SectionOut, status_code=201)
async def create_section(data: SectionCreate, db: AsyncSession = Depends(get_db)):
    return await section_service.create(db, data)


@router.get("", response_model=List[SectionOut])
async def list_sections(db: AsyncSession = Depends(get_db)):
    return await section_service.list_all(db)


# NOTE: /reorder MUST come before /{section_id} to avoid route collision
@router.post("/reorder", status_code=204)
async def reorder_sections(data: ReorderRequest, db: AsyncSession = Depends(get_db)):
    await section_service.reorder(db, data.ids)


@router.get("/{section_id}", response_model=SectionOut)
async def get_section(section_id: str, db: AsyncSession = Depends(get_db)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


@router.put("/{section_id}", response_model=SectionOut)
async def update_section(section_id: str, data: SectionUpdate, db: AsyncSession = Depends(get_db)):
    section = await section_service.update(db, section_id, data)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


@router.delete("/{section_id}", status_code=204)
async def delete_section(section_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await section_service.delete(db, section_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Section not found")


@router.get("/{section_id}/versions", response_model=List[SectionVersionOut])
async def list_section_versions(section_id: str, db: AsyncSession = Depends(get_db)):
    return await section_service.list_versions(db, section_id)


@router.post("/{section_id}/versions/{version_id}/restore", response_model=SectionOut)
async def restore_section_version(section_id: str, version_id: str, db: AsyncSession = Depends(get_db)):
    section = await section_service.restore_version(db, section_id, version_id)
    if not section:
        raise HTTPException(status_code=404, detail="Version or section not found")
    return section
