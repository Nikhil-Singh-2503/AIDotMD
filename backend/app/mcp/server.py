"""
AIDotMd MCP Server — exposes workspace tools to AI agents.

Clients connect via: POST <base_url>/mcp  (StreamableHTTP transport)
Auth: Authorization: Bearer dm_live_<key>

Tools available to agents:
  list_sections         — browse workspace structure
  create_section        — add a new section
  list_documents        — list docs (optionally filtered by section)
  get_document          — read full doc content
  create_document       — write a new doc to a section
  update_document       — replace or append to existing doc
  stream_write          — write a doc chunk-by-chunk (real-time in browser)
  commit_stream         — finalize streamed content and save to DB
  search_docs           — full-text search across all docs
"""
from fastmcp import FastMCP
from app.db import SessionLocal
from app.services import section_service, document_service, search_service
from app.services.stream_manager import stream_manager
from app.schemas.section import SectionCreate
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.config import get_settings

mcp = FastMCP(
    name="AIDotMd",
    instructions=(
        "You are connected to an AIDotMd documentation workspace. "
        "You can browse, create, and update markdown documents organised into sections. "
        "Use stream_write + commit_stream when writing long documents so the user "
        "can watch the content appear live in their browser."
    ),
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _doc_url(section_slug: str, doc_slug: str) -> str:
    base = get_settings().BASE_URL.rstrip("/")
    return f"{base}/docs/{section_slug}/{doc_slug}"


# ── Section tools ─────────────────────────────────────────────────────────────

@mcp.tool
async def list_sections() -> list[dict]:
    """List all sections in the workspace, including nested ones."""
    async with SessionLocal() as db:
        sections = await section_service.list_all(db)
        return [
            {
                "id": s.id,
                "title": s.title,
                "slug": s.slug,
                "description": s.description or "",
                "parent_id": s.parent_id or "",
            }
            for s in sections
        ]


@mcp.tool
async def create_section(title: str, description: str = "", parent_id: str = "") -> dict:
    """
    Create a new section. Can be top-level or nested under a parent section.

    Args:
        title: The section title (e.g. "Redis Patterns")
        description: Optional short description
        parent_id: ID of the parent section (if any)
        Leave empty to create a top-level section. Use list_sections to find section IDs.
    """
    async with SessionLocal() as db:
        section = await section_service.create(
            db, SectionCreate(title=title, description=description or None, parent_id=parent_id or None)
        )
        return {"id": section.id, "title": section.title, "slug": section.slug, "parent_id": section.parent_id or ""}


# ── Document tools ────────────────────────────────────────────────────────────

@mcp.tool
async def list_documents(section_id: str = "") -> list[dict]:
    """
    List documents in the workspace.

    Args:
        section_id: Filter by section ID. Leave blank to list all documents.
    """
    async with SessionLocal() as db:
        docs = (
            await document_service.list_by_section(db, section_id)
            if section_id
            else await document_service.list_all(db)
        )
        return [
            {
                "id": d.id,
                "title": d.title,
                "slug": d.slug,
                "section_id": d.section_id,
                "description": d.description or "",
            }
            for d in docs
        ]


@mcp.tool
async def get_document(
    doc_id: str = "",
    section_slug: str = "",
    doc_slug: str = "",
) -> dict:
    """
    Get a document's full markdown content.

    Args:
        doc_id: Document ID (preferred, fastest lookup)
        section_slug + doc_slug: Alternative — use the slugs from list_documents / list_sections
    """
    async with SessionLocal() as db:
        if doc_id:
            doc = await document_service.get(db, doc_id)
        elif section_slug and doc_slug:
            doc = await document_service.get_by_slug(db, section_slug, doc_slug)
        else:
            return {"error": "Provide doc_id OR both section_slug and doc_slug"}

        if not doc:
            return {"error": "Document not found"}

        section = await section_service.get(db, doc.section_id)
        return {
            "id": doc.id,
            "title": doc.title,
            "slug": doc.slug,
            "section_id": doc.section_id,
            "section_slug": section.slug if section else "",
            "content": doc.content,
            "url": _doc_url(section.slug, doc.slug) if section else "",
        }


@mcp.tool
async def create_document(
    title: str,
    content: str,
    section_id: str,
    description: str = "",
) -> dict:
    """
    Create a new markdown document in a section.

    Args:
        title: Document title
        content: Full markdown content
        section_id: ID of the section to place it in (get IDs from list_sections)
        description: Optional short description shown in search results

    Returns the document ID, slug, and a URL to view it in the browser.
    """
    async with SessionLocal() as db:
        doc = await document_service.create(
            db,
            DocumentCreate(
                title=title,
                content=content,
                section_id=section_id,
                description=description or None,
            ),
        )
        section = await section_service.get(db, doc.section_id)
        return {
            "id": doc.id,
            "title": doc.title,
            "slug": doc.slug,
            "url": _doc_url(section.slug, doc.slug) if section else "",
        }


@mcp.tool
async def update_document(
    doc_id: str,
    content: str = "",
    title: str = "",
    append: str = "",
) -> dict:
    """
    Update an existing document.

    Args:
        doc_id: Document ID to update
        content: Replace the entire content with this (use for full rewrites)
        title: New title (optional — leave blank to keep existing)
        append: Append this text to the end of the existing content

    Note: 'content' and 'append' are mutually exclusive. 'content' takes precedence.
    """
    async with SessionLocal() as db:
        doc = await document_service.get(db, doc_id)
        if not doc:
            return {"error": f"Document '{doc_id}' not found"}

        if content:
            new_content = content
        elif append:
            new_content = doc.content + "\n\n" + append
        else:
            new_content = doc.content  # only title change

        updated = await document_service.update(
            db,
            doc_id,
            DocumentUpdate(
                title=title or None,
                content=new_content,
            ),
        )
        return {
            "id": updated.id,
            "title": updated.title,
            "updated_at": updated.updated_at.isoformat(),
        }


# ── Streaming tools ───────────────────────────────────────────────────────────

@mcp.tool
async def stream_write(doc_id: str, chunk: str) -> dict:
    """
    Write a chunk of content to a document in real-time.

    The chunk is broadcast immediately to any browser tabs viewing the document
    so the user can watch the content appear live. Call commit_stream when done
    to save the final content to the database.

    Args:
        doc_id: The document to write to (must already exist — create it first)
        chunk: A piece of markdown text (a sentence, paragraph, or section)

    Workflow:
        1. create_document(title, content="", section_id=...) → get doc_id
        2. stream_write(doc_id, "## Introduction\\n\\n...")
        3. stream_write(doc_id, "More content...")
        4. commit_stream(doc_id)
    """
    async with SessionLocal() as db:
        doc = await document_service.get(db, doc_id)
        if not doc:
            return {"error": f"Document '{doc_id}' not found"}

    await stream_manager.write_chunk(doc_id, chunk)
    return {
        "doc_id": doc_id,
        "chars_written": len(chunk),
        "buffer_length": len(stream_manager.get_buffer(doc_id)),
    }


@mcp.tool
async def commit_stream(doc_id: str) -> dict:
    """
    Finalize a streaming write and save the accumulated content to the database.

    Must be called after stream_write to persist the content. Until this is
    called the content only exists in memory and will be lost on server restart.

    Args:
        doc_id: The document whose stream to finalize
    """
    content = await stream_manager.commit(doc_id)
    if not content:
        return {"error": "No active stream for this document"}

    async with SessionLocal() as db:
        doc = await document_service.get(db, doc_id)
        if not doc:
            return {"error": f"Document '{doc_id}' not found"}

        updated = await document_service.update(
            db, doc_id, DocumentUpdate(content=content)
        )
        section = await section_service.get(db, updated.section_id)
        return {
            "id": updated.id,
            "title": updated.title,
            "content_length": len(content),
            "url": _doc_url(section.slug, updated.slug) if section else "",
        }


# ── Search tool ───────────────────────────────────────────────────────────────

@mcp.tool
async def search_docs(query: str, limit: int = 10) -> list[dict]:
    """
    Full-text search across all documents in the workspace.

    Args:
        query: Search terms
        limit: Maximum number of results to return (default 10, max 20)

    Returns a list of matching documents with title, section, and a content snippet.
    """
    async with SessionLocal() as db:
        results = await search_service.search(db, query, limit=min(limit, 20))
        return results
