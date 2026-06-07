from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models.models import User as UserModel
from app.schemas.auth import UserOut, CreateUserRequest, UpdateUserRequest, CreateUserResponse, UserMcpKeyOut
from app.services import user_service

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin"])


async def _require_admin(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[UserModel]:
    from app.api.auth import _resolve_user
    user = await _resolve_user(request, db)
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _to_user_out(u: UserModel) -> UserOut:
    return UserOut(
        id=u.id,
        email=u.email,
        display_name=u.display_name,
        role=u.role,
        is_active=u.is_active,
        is_service_account=u.is_service_account,
        has_mcp_key=bool(u.mcp_key),
        last_login_at=u.last_login_at,
        created_at=u.created_at,
    )


@router.get("", response_model=List[UserOut])
async def list_users(request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    users = await user_service.get_all_users(db)
    return [_to_user_out(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_out(user)


@router.post("", response_model=CreateUserResponse, status_code=201)
async def create_user(data: CreateUserRequest, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    existing = await user_service.get_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user, mcp_key = await user_service.create_user(db, data.email, data.display_name, data.password, data.role)
    return CreateUserResponse(user=_to_user_out(user), mcp_key=mcp_key)


@router.get("/{user_id}/mcp-key", response_model=UserMcpKeyOut)
async def get_user_mcp_key(user_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.mcp_key:
        raise HTTPException(status_code=404, detail="User has no MCP key")
    return UserMcpKeyOut(mcp_key=user.mcp_key)


@router.post("/{user_id}/regenerate-mcp-key", response_model=UserMcpKeyOut)
async def regenerate_user_mcp_key(user_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    new_key = await user_service.regenerate_mcp_key(db, user_id)
    if not new_key:
        raise HTTPException(status_code=404, detail="User not found")
    return UserMcpKeyOut(mcp_key=new_key)


@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: str, data: UpdateUserRequest, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    user = await user_service.update_user(db, user_id, data.email, data.display_name, data.role, data.is_active)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_out(user)


@router.post("/{user_id}/reset-password")
async def reset_password(user_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    temp_password = await user_service.reset_password(db, user_id, "")
    if not temp_password:
        raise HTTPException(status_code=404, detail="User not found")
    return {"temp_password": temp_password}


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, request: Request, db: AsyncSession = Depends(get_db), _=Depends(_require_admin)):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_service_account:
        raise HTTPException(status_code=400, detail="Cannot delete service account")
    if user.role == "admin":
        result = await db.execute(select(UserModel).where(UserModel.role == "admin"))
        admins = list(result.scalars().all())
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin")
    await db.delete(user)
    await db.commit()
