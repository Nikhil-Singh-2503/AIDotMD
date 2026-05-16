from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.schemas.auth import LoginRequest, ChangePasswordRequest, AuthResponse, UserOut
from app.services import auth_service, user_service
from app.models.models import User as UserModel

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_by_email(db, data.email)
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not auth_service.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    await user_service.update_last_login(db, user.id)
    session = await auth_service.create_session(db, user.id)
    return AuthResponse(user=UserOut.model_validate(user), token=session.token)


@router.post("/logout", status_code=204)
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    token = _extract_token(request)
    if token:
        await auth_service.delete_session(db, token)


@router.get("/me", response_model=UserOut)
async def me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserOut.model_validate(user)


@router.post("/change-password", response_model=UserOut)
async def change_password(request: Request, data: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.password_hash or not auth_service.verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = auth_service.hash_password(data.new_password)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/reset-admin")
async def reset_admin_password(request: Request, db: AsyncSession = Depends(get_db)):
    host = request.headers.get("host", "").split(":")[0]
    if host not in {"localhost", "127.0.0.1", "::1"}:
        raise HTTPException(status_code=403, detail="Only accessible from localhost")

    user = await user_service.get_by_email(db, "admin@aidotmd.local")
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")

    import secrets
    temp_password = secrets.token_urlsafe(12)
    user.password_hash = auth_service.hash_password(temp_password)
    await db.commit()
    return {"email": user.email, "temp_password": temp_password}


async def _resolve_user(request: Request, db: AsyncSession) -> Optional[UserModel]:
    token = _extract_token(request)
    if not token:
        return None
    session = await auth_service.get_session_by_token(db, token)
    if not session:
        return None
    return await user_service.get_by_id(db, session.user_id)


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    cookie = request.cookies.get("aidotmd_session")
    if cookie:
        return cookie
    return None
