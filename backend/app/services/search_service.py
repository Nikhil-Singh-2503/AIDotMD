from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.models import Document, Section
from typing import List


def _snippet(text: str, query: str, radius: int = 80) -> str:
    """Extract a ~2*radius char snippet centered on the first occurrence of query."""
    idx = text.lower().find(query.lower())
    if idx == -1:
        return text[:radius * 2].rstrip() + "…"
    start = max(0, idx - radius)
    end = min(len(text), idx + len(query) + radius)
    snippet = ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")
    return snippet


async def search(db: AsyncSession, q: str, limit: int = 20) -> List[dict]:
    q = q.strip()
    if len(q) < 2:
        return []

    pattern = f"%{q}%"

    # Fetch all matching documents with their sections in one query
    stmt = (
        select(Document, Section)
        .join(Section, Document.section_id == Section.id)
        .where(
            Document.is_published == True,
            or_(
                Document.title.ilike(pattern),
                Document.description.ilike(pattern),
                Document.content.ilike(pattern),
            )
        )
    )
    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for doc, section in rows:
        # Rank: title match = 0 (best), description = 1, content = 2
        title_match = q.lower() in doc.title.lower()
        desc_match = doc.description and q.lower() in doc.description.lower()

        if title_match:
            rank = 0
            snippet = doc.description or _snippet(doc.content, q)
        elif desc_match:
            rank = 1
            snippet = _snippet(doc.description, q)
        else:
            rank = 2
            snippet = _snippet(doc.content, q)

        results.append({
            "doc_id": doc.id,
            "title": doc.title,
            "section_title": section.title,
            "section_slug": section.slug,
            "doc_slug": doc.slug,
            "snippet": snippet,
            "match_field": "title" if title_match else ("description" if desc_match else "content"),
            "_rank": rank,
        })

    # Sort by rank then title
    results.sort(key=lambda r: (r["_rank"], r["title"].lower()))
    for r in results:
        del r["_rank"]

    return results[:limit]
