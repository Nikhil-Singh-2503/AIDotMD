from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from app.db import get_db
from app.models.models import Section, Document
from app.schemas.section import SectionOut
from app.schemas.document import DocumentOut
from app.services.document_service import get_storage

router = APIRouter(prefix="/api/v1/trash", tags=["trash"])

@router.get("")
async def list_trash(db: AsyncSession = Depends(get_db)):
    # Get deleted sections
    sections_res = await db.execute(select(Section).where(Section.deleted_at.is_not(None)).order_by(Section.deleted_at.desc()))
    sections = sections_res.scalars().all()
    
    # Get deleted documents
    docs_res = await db.execute(select(Document).where(Document.deleted_at.is_not(None)).order_by(Document.deleted_at.desc()))
    docs = docs_res.scalars().all()
    
    # Return as dict matching the schemas
    return {
        "sections": sections,
        "documents": docs
    }

@router.post("/restore")
async def restore_item(data: dict, db: AsyncSession = Depends(get_db)):
    item_id = data.get("id")
    item_type = data.get("type")
    
    if not item_id or not item_type:
        raise HTTPException(status_code=400, detail="Missing id or type")
        
    if item_type == "section":
        result = await db.execute(select(Section).where(Section.id == item_id))
        section = result.scalar_one_or_none()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found in trash")
        section.deleted_at = None
        await db.commit()
        return {"status": "ok"}
        
    elif item_type == "document":
        result = await db.execute(select(Document).where(Document.id == item_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in trash")
            
        # Check if parent section is also deleted
        section_result = await db.execute(select(Section).where(Section.id == doc.section_id))
        section = section_result.scalar_one_or_none()
        if not section:
            raise HTTPException(status_code=400, detail="Parent section does not exist")
        if section.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Cannot restore document because its parent section is in trash.")
            
        doc.deleted_at = None
        # write it back to filesystem
        storage = get_storage()
        await storage.write_document(section.slug, doc.slug, doc.content, title=doc.title, order=doc.order)
        
        await db.commit()
        return {"status": "ok"}
    
    raise HTTPException(status_code=400, detail="Invalid type")

@router.delete("/permanent")
async def hard_delete_item(id: str = Query(...), type: str = Query(...), db: AsyncSession = Depends(get_db)):
    if type == "section":
        result = await db.execute(select(Section).where(Section.id == id, Section.deleted_at.is_not(None)))
        section = result.scalar_one_or_none()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found in trash")
        await db.delete(section)
        await db.commit()
        return {"status": "ok"}
        
    elif type == "document":
        result = await db.execute(select(Document).where(Document.id == id, Document.deleted_at.is_not(None)))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in trash")
        await db.delete(doc)
        await db.commit()
        return {"status": "ok"}
        
    raise HTTPException(status_code=400, detail="Invalid type")
