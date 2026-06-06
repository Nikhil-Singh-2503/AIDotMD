from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db import get_db
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentOut, DocumentReorderRequest, DocumentVersionOut
from app.services import document_service, permission_service

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


async def _check_doc_access(request: Request, db: AsyncSession, doc_id: str, section_id: str, level: str) -> None:
    user = getattr(request.state, "user", None)
    link = getattr(request.state, "share_link", None)

    # Share link is set — verify it's scoped to this document
    if link:
        if link.document_id and link.document_id != doc_id:
            raise HTTPException(status_code=403, detail="Share link does not grant access to this document")
        if link.section_id and link.section_id != section_id:
            raise HTTPException(status_code=403, detail="Share link does not grant access to this section")
        if link.permission == "read" and level == "write":
            raise HTTPException(status_code=403, detail="Share link is view-only")
        return

    if user and not await permission_service.can_access(db, user, level, doc_id, section_id):
        raise HTTPException(status_code=403, detail=f"You need {level} permission to access this document")


def _enrich_doc(doc):
    """Return a dict with created_by_name / updated_by_name populated."""
    data = DocumentOut.model_validate(doc).model_dump()
    data["created_by_name"] = doc.creator.display_name if doc.creator else None
    data["updated_by_name"] = doc.updater.display_name if doc.updater else None
    return DocumentOut(**data)


def _enrich_ver(ver):
    """Return a dict with created_by_name populated."""
    data = DocumentVersionOut.model_validate(ver).model_dump()
    data["created_by_name"] = ver.creator.display_name if ver.creator else None
    return DocumentVersionOut(**data)


def _get_user_id(request: Request) -> Optional[str]:
    user = getattr(request.state, "user", None)
    return user.id if user else None


@router.post("", response_model=DocumentOut, status_code=201)
async def create_document(data: DocumentCreate, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    doc = await document_service.create(db, data, user_id=_get_user_id(request))
    return _enrich_doc(doc)


@router.get("", response_model=List[DocumentOut])
async def list_documents(request: Request, section_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    docs = await document_service.list_all(db) if not section_id else await document_service.list_by_section(db, section_id)
    user = getattr(request.state, "user", None)
    link = getattr(request.state, "share_link", None)
    if user:
        tuples = [(d.id, d.section_id) for d in docs]
        visible = set(await permission_service.filter_visible(db, user, tuples))
        docs = [d for d in docs if d.id in visible]
    elif link:
        docs = [d for d in docs
                if (link.document_id and d.id == link.document_id)
                or (link.section_id and d.section_id == link.section_id)]
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    return [_enrich_doc(d) for d in docs]


@router.post("/reorder", status_code=204)
async def reorder_documents(data: DocumentReorderRequest, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    await document_service.reorder(db, data.section_id, data.ids)


@router.get("/by-slug/{section_slug}/{doc_slug}", response_model=DocumentOut)
async def get_document_by_slug(section_slug: str, doc_slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get_by_slug(db, section_slug, doc_slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "read")
    return _enrich_doc(doc)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "read")
    return _enrich_doc(doc)


@router.put("/{doc_id}", response_model=DocumentOut)
async def update_document(doc_id: str, data: DocumentUpdate, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "write")
    doc = await document_service.update(db, doc_id, data, user_id=_get_user_id(request))
    return _enrich_doc(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "write")
    await document_service.delete(db, doc_id)


@router.get("/{doc_id}/versions", response_model=List[DocumentVersionOut])
async def list_document_versions(doc_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "read")
    versions = await document_service.list_versions(db, doc_id)
    for v in versions:
        _enrich_ver(v)
    return versions


@router.get("/{doc_id}/versions/diff")
async def diff_document_versions(
    doc_id: str,
    v1: str = Query(..., description="First version ID"),
    v2: str = Query(..., description="Second version ID"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Return two document versions for side-by-side diffing."""
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if request:
        await _check_doc_access(request, db, doc.id, doc.section_id, "read")

    v1_ver = await document_service.get_version(db, v1)
    v2_ver = await document_service.get_version(db, v2)
    if not v1_ver or not v2_ver:
        raise HTTPException(status_code=404, detail="Version not found")
    if v1_ver.document_id != doc_id or v2_ver.document_id != doc_id:
        raise HTTPException(status_code=400, detail="Version does not belong to this document")

    return {
        "v1": _enrich_ver(v1_ver).model_dump(),
        "v2": _enrich_ver(v2_ver).model_dump(),
    }


@router.post("/{doc_id}/versions/{version_id}/restore", response_model=DocumentOut)
async def restore_document_version(doc_id: str, version_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(permission_service.require_write_permission)):
    doc = await document_service.get(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await _check_doc_access(request, db, doc.id, doc.section_id, "write")
    doc = await document_service.restore_version(db, doc_id, version_id, user_id=_get_user_id(request))
    if not doc:
        raise HTTPException(status_code=404, detail="Version or document not found")
    return _enrich_doc(doc)
