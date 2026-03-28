from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db import get_db
from app.schemas.document import DocumentCreate, DocumentOut
from app.services import document_service
from app.services.document_service import get_storage

router = APIRouter(prefix="/api/v1/upload", tags=["upload"])


class ImageUploadResponse(BaseModel):
    url: str
    filename: str


def parse_frontmatter(content: str):
    """Extract YAML frontmatter from markdown. Returns (metadata, body)."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    meta = {}
    for line in parts[1].strip().splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, parts[2].strip()


@router.post("/markdown", response_model=DocumentOut, status_code=201)
async def upload_markdown(
    section_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files are accepted")
    raw = (await file.read()).decode("utf-8")
    meta, body = parse_frontmatter(raw)
    title = meta.get("title") or file.filename.replace(".md", "").replace("-", " ").title()
    slug = meta.get("id") or meta.get("slug") or None
    data = DocumentCreate(title=title, section_id=section_id, slug=slug, content=body)
    return await document_service.create(db, data)


@router.post("/image", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    allowed = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {allowed}")
    data = await file.read()
    url = await get_storage().save_image(file.filename, data)
    return ImageUploadResponse(url=url, filename=file.filename)
