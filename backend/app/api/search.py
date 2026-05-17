from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db import get_db
from app.services import search_service, permission_service
from pydantic import BaseModel


class SearchResult(BaseModel):
    doc_id: str
    title: str
    section_title: str
    section_slug: str
    doc_slug: str
    snippet: str
    match_field: str


router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("", response_model=List[SearchResult])
async def search(q: str = Query(default=""), request: Request = None, db: AsyncSession = Depends(get_db)):
    results = await search_service.search(db, q)
    if not results:
        return []

    user = getattr(request.state, "user", None) if request else None
    link = getattr(request.state, "share_link", None) if request else None

    # Share link user — only show results within the shared resource
    if link:
        filtered = []
        for r in results:
            if link.document_id and r.doc_id == link.document_id:
                filtered.append(r)
            elif link.section_id:
                from app.services import document_service
                doc = await document_service.get(db, r.doc_id)
                if doc and doc.section_id == link.section_id:
                    filtered.append(r)
        return filtered

    # Authenticated user — filter by their permissions
    if user:
        doc_tuples = [(r.doc_id, None) for r in results]
        visible_ids = set(await permission_service.filter_visible(db, user, doc_tuples))
        return [r for r in results if r.doc_id in visible_ids]

    return results
