import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models.models import ShareLink as ShareLinkModel
from app.schemas.share_link import ShareLinkCreate, ShareLinkOut
from app.services.permission_service import require_write_permission

router = APIRouter(prefix="/api/v1/share-links", tags=["share-links"])


def _generate_token() -> str:
    return f"dm_share_{secrets.token_urlsafe(32)}"


async def _resolve_user(request: Request, db: AsyncSession):
    token = _extract_token(request)
    if not token:
        return None
    from app.services import auth_service, user_service
    session = await auth_service.get_session_by_token(db, token)
    if not session:
        return None
    return await user_service.get_by_id(db, session.user_id)


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get("aidotmd_session")


@router.post("", response_model=ShareLinkOut, status_code=201)
async def create_share_link(
    data: ShareLinkCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_write_permission),
):
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if data.permission not in ("read", "write"):
        raise HTTPException(status_code=400, detail="Permission must be 'read' or 'write'")
    if not data.document_id and not data.section_id:
        raise HTTPException(status_code=400, detail="Must specify document_id or section_id")

    expires_at = None
    if data.expires_in_seconds:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.expires_in_seconds)

    link = ShareLinkModel(
        token=_generate_token(),
        document_id=data.document_id,
        section_id=data.section_id,
        permission=data.permission,
        expires_at=expires_at,
        max_uses=data.max_uses,
        created_by=user.id,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return ShareLinkOut.model_validate(link)


@router.get("", response_model=List[ShareLinkOut])
async def list_share_links(
    request: Request,
    document_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    query = select(ShareLinkModel)
    if user.role != "admin":
        query = query.where(ShareLinkModel.created_by == user.id)
    if document_id:
        query = query.where(ShareLinkModel.document_id == document_id)
    if section_id:
        query = query.where(ShareLinkModel.section_id == section_id)
    query = query.order_by(ShareLinkModel.created_at.desc())
    result = await db.execute(query)
    return [ShareLinkOut.model_validate(s) for s in result.scalars().all()]


@router.delete("/{link_id}", status_code=204)
async def revoke_share_link(
    link_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_write_permission),
):
    result = await db.execute(select(ShareLinkModel).where(ShareLinkModel.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    await db.delete(link)
    await db.commit()
