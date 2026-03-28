from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db import get_db
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentOut, DocumentReorderRequest, DocumentVersionOut
from app.services import document_service

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("", response_model=DocumentOut, status_code=201)
async def create_document(data: DocumentCreate, db: AsyncSession = Depends(get_db)):
    return await document_service.create(db, data)


@router.get("", response_model=List[DocumentOut])
async def list_documents(section_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    if section_id:
        return await document_service.list_by_section(db, section_id)
    return await document_service.list_all(db)


# NOTE: /reorder and /by-slug MUST come before /{doc_id} to avoid route collision
@router.post("/reorder", status_code=204)
async def reorder_documents(data: DocumentReorderRequest, db: AsyncSession = Depends(get_db)):
    await document_service.reorder(db, data.section_id, data.ids)


@router.get("/by-slug/{section_slug}/{doc_slug}", response_model=DocumentOut)
async def get_document_by_slug(section_slug: str, doc_slug: str, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get_by_slug(db, section_slug, doc_slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}", response_model=DocumentOut)
async def update_document(doc_id: str, data: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    doc = await document_service.update(db, doc_id, data)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await document_service.delete(db, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{doc_id}/versions", response_model=List[DocumentVersionOut])
async def list_document_versions(doc_id: str, db: AsyncSession = Depends(get_db)):
    return await document_service.list_versions(db, doc_id)


@router.post("/{doc_id}/versions/{version_id}/restore", response_model=DocumentOut)
async def restore_document_version(doc_id: str, version_id: str, db: AsyncSession = Depends(get_db)):
    doc = await document_service.restore_version(db, doc_id, version_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Version or document not found")
    return doc
