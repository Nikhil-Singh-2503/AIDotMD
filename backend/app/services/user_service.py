import secrets
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import User
from app.services.auth_service import hash_password


async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_all_users(db: AsyncSession) -> list:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession,
    email: str,
    display_name: str,
    password: str,
    role: str = "editor",
) -> User:
    user = User(
        email=email,
        display_name=display_name,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user_id: str,
    email: Optional[str] = None,
    display_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Optional[User]:
    user = await get_by_id(db, user_id)
    if not user:
        return None
    if email is not None:
        user.email = email
    if display_name is not None:
        user.display_name = display_name
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user


async def update_last_login(db: AsyncSession, user_id: str) -> None:
    user = await get_by_id(db, user_id)
    if user:
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()


async def reset_password(db: AsyncSession, user_id: str, new_password: str) -> Optional[str]:
    user = await get_by_id(db, user_id)
    if not user:
        return None
    temp_password = new_password if new_password else secrets.token_urlsafe(12)
    user.password_hash = hash_password(temp_password)
    await db.commit()
    return temp_password


async def ensure_admin_user(db: AsyncSession) -> Optional[User]:
    import os
    result = await db.execute(select(User).where(User.role == "admin"))
    admins = list(result.scalars().all())

    env_password = os.environ.get("ADMIN_PASSWORD", "")

    if admins:
        first_admin = admins[0]
        if env_password:
            first_admin.password_hash = hash_password(env_password)
            await db.commit()
            print("=" * 60)
            print("AIDotMD Admin password updated from ADMIN_PASSWORD env var")
            print("=" * 60)
        return first_admin

    temp_password = env_password if env_password else secrets.token_urlsafe(12)
    admin = User(
        email="admin@aidotmd.local",
        display_name="Admin",
        password_hash=hash_password(temp_password),
        role="admin",
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    print("=" * 60)
    print("AIDotMD Admin Account (auto-created)")
    print(f"  Email:    admin@aidotmd.local")
    print(f"  Password: {temp_password}")
    print("=" * 60)
    print("Please log in and change your password immediately.")

    return admin


async def ensure_mcp_user(db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.is_service_account == True))
    service_users = list(result.scalars().all())
    if service_users:
        return service_users[0]

    mcp_user = User(
        email="mcp@aidotmd.internal",
        display_name="MCP Agent",
        password_hash=None,
        role="editor",
        is_service_account=True,
    )
    db.add(mcp_user)
    await db.commit()
    await db.refresh(mcp_user)
    return mcp_user
