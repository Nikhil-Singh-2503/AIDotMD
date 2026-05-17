from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db import get_db
from app.schemas.section import SectionCreate, SectionUpdate, SectionOut, SectionVersionOut, ReorderRequest
from app.services import section_service, permission_service

router = APIRouter(prefix="/api/v1/sections", tags=["sections"])


async def _check_section_access(request: Request, db: AsyncSession, section_id: str, level: str) -> None:
    user = getattr(request.state, "user", None)
    link = getattr(request.state, "share_link", None)

    if link:
        if link.section_id and link.section_id != section_id:
            raise HTTPException(status_code=403, detail="Share link does not grant access to this section")
        if link.document_id:
            raise HTTPException(status_code=403, detail="This share link is for a document, not a section")
        if link.permission == "read" and level == "write":
            raise HTTPException(status_code=403, detail="Share link is view-only")
        return

    if user and not await permission_service.can_access(db, user, level, section_id=section_id):
        raise HTTPException(status_code=403, detail=f"You need {level} permission to access this section")


@router.post("", response_model=SectionOut, status_code=201)
async def create_section(data: SectionCreate, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    return await section_service.create(db, data)


@router.get("", response_model=List[SectionOut])
async def list_sections(db: AsyncSession = Depends(get_db)):
    return await section_service.list_all(db)


@router.post("/reorder", status_code=204)
async def reorder_sections(data: ReorderRequest, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    await section_service.reorder(db, data.ids)


@router.get("/{section_id}", response_model=SectionOut)
async def get_section(section_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await _check_section_access(request, db, section.id, "read")
    return section


@router.put("/{section_id}", response_model=SectionOut)
async def update_section(section_id: str, data: SectionUpdate, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await _check_section_access(request, db, section.id, "write")
    section = await section_service.update(db, section_id, data)
    return section


@router.delete("/{section_id}", status_code=204)
async def delete_section(section_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await _check_section_access(request, db, section.id, "admin")
    await section_service.delete(db, section_id)


@router.get("/{section_id}/versions", response_model=List[SectionVersionOut])
async def list_section_versions(section_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await _check_section_access(request, db, section.id, "read")
    return await section_service.list_versions(db, section_id)


@router.post("/{section_id}/versions/{version_id}/restore", response_model=SectionOut)
async def restore_section_version(section_id: str, version_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    section = await section_service.get(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await _check_section_access(request, db, section.id, "write")
    section = await section_service.restore_version(db, section_id, version_id)
    if not section:
        raise HTTPException(status_code=404, detail="Version or section not found")
    return section
