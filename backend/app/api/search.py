from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db import get_db
from app.services import search_service
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
async def search(q: str = Query(default=""), db: AsyncSession = Depends(get_db)):
    return await search_service.search(db, q)
