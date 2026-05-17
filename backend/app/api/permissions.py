from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.db import get_db
from app.models.models import DocPermission as DocPermissionModel, User
from app.schemas.permission import PermissionCreate, PermissionUpdate, PermissionOut
from app.services.permission_service import require_write_permission

_VALID_PERMS = {"read", "write"}

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])


async def _resolve_user(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[User]:
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


@router.get("", response_model=List[PermissionOut])
async def list_permissions(
    document_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(DocPermissionModel)
    if document_id:
        query = query.where(DocPermissionModel.document_id == document_id)
    if section_id:
        query = query.where(DocPermissionModel.section_id == section_id)
    result = await db.execute(query.order_by(DocPermissionModel.created_at.desc()))
    return [PermissionOut.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=PermissionOut, status_code=201)
async def create_permission(
    data: PermissionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_write_permission),
):
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Verify target user exists
    target = await db.execute(select(User).where(User.id == data.user_id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    if data.permission not in _VALID_PERMS:
        raise HTTPException(status_code=400, detail="Permission must be 'read' or 'write'")
    if not data.document_id and not data.section_id:
        raise HTTPException(status_code=400, detail="Must specify document_id or section_id")

    existing = await db.execute(
        select(DocPermissionModel).where(
            DocPermissionModel.user_id == data.user_id,
            (
                (DocPermissionModel.document_id == data.document_id) if data.document_id
                else (DocPermissionModel.section_id == data.section_id)
            ),
        )
    )
    existing_perm = existing.scalar_one_or_none()
    if existing_perm:
        existing_perm.permission = data.permission
        existing_perm.granted_by = user.id
        await db.commit()
        await db.refresh(existing_perm)
        return PermissionOut.model_validate(existing_perm)

    perm = DocPermissionModel(
        user_id=data.user_id,
        document_id=data.document_id,
        section_id=data.section_id,
        permission=data.permission,
        granted_by=user.id,
    )
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return PermissionOut.model_validate(perm)


@router.put("/{perm_id}", response_model=PermissionOut)
async def update_permission(
    perm_id: str,
    data: PermissionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_write_permission),
):
    if data.permission not in _VALID_PERMS:
        raise HTTPException(status_code=400, detail="Permission must be 'read' or 'write'")
    result = await db.execute(select(DocPermissionModel).where(DocPermissionModel.id == perm_id))
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    perm.permission = data.permission
    await db.commit()
    await db.refresh(perm)
    return PermissionOut.model_validate(perm)


@router.delete("/{perm_id}", status_code=204)
async def delete_permission(
    perm_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_write_permission),
):
    result = await db.execute(select(DocPermissionModel).where(DocPermissionModel.id == perm_id))
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    await db.delete(perm)
    await db.commit()
