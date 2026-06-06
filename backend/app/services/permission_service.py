from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Tuple
from app.models.models import DocPermission, User

# Resource-level permission levels (per-doc and per-section)
_PERM_LEVELS = {"read": 0, "write": 1}

# Global role defaults
# viewer = -1 means NO access without explicit permission override
_ROLE_DEFAULTS = {"admin": 2, "editor": 1, "viewer": -1}

_VALID_RESOURCE_PERMS = {"read", "write"}


def _level(name: str) -> int:
    return _PERM_LEVELS.get(name, -1)


def _role_default(role: str) -> int:
    return _ROLE_DEFAULTS.get(role, 0)


async def get_effective_level(
    db: AsyncSession,
    user: User,
    document_id: Optional[str] = None,
    section_id: Optional[str] = None,
) -> int:
    """Returns the effective permission level for a user on a resource.
    Resolution: doc-level → section-level → global role default.
    Most specific wins — can both elevate and restrict.
    """
    if document_id:
        result = await db.execute(
            select(DocPermission).where(
                DocPermission.user_id == user.id,
                DocPermission.document_id == document_id,
            )
        )
        perm = result.scalar_one_or_none()
        if perm:
            return _level(perm.permission)

    if section_id:
        result = await db.execute(
            select(DocPermission).where(
                DocPermission.user_id == user.id,
                DocPermission.section_id == section_id,
            )
        )
        perm = result.scalar_one_or_none()
        if perm:
            return _level(perm.permission)

    return _role_default(user.role)


async def can_access(
    db: AsyncSession,
    user: User,
    required: str,
    document_id: Optional[str] = None,
    section_id: Optional[str] = None,
) -> bool:
    effective = await get_effective_level(db, user, document_id, section_id)
    return effective >= _level(required)


async def require_write_permission(request: Request) -> None:
    link = getattr(request.state, "share_link", None)
    if link is not None and getattr(link, "permission", "read") == "write":
        return
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if _role_default(user.role) < _level("write"):
        raise HTTPException(status_code=403, detail="Viewer role does not have write permission")


async def require_admin_permission(request: Request) -> None:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if _role_default(user.role) < 2:
        raise HTTPException(status_code=403, detail="Admin access required")


async def filter_visible(
    db: AsyncSession,
    user: User,
    doc_tuples: List[Tuple[str, Optional[str]]],
) -> List[str]:
    doc_ids = [t[0] for t in doc_tuples if t[0]]
    section_ids = list(set(t[1] for t in doc_tuples if t[1]))

    doc_perms_map = {}
    sec_perms_map = {}
    if doc_ids:
        result = await db.execute(
            select(DocPermission).where(
                DocPermission.user_id == user.id,
                DocPermission.document_id.in_(doc_ids),
            )
        )
        for p in result.scalars().all():
            if p.document_id:
                doc_perms_map[p.document_id] = _level(p.permission)
    if section_ids:
        result = await db.execute(
            select(DocPermission).where(
                DocPermission.user_id == user.id,
                DocPermission.section_id.in_(section_ids),
            )
        )
        for p in result.scalars().all():
            if p.section_id:
                sec_perms_map[p.section_id] = _level(p.permission)

    visible = []
    default_level = _role_default(user.role)
    for doc_id, section_id in doc_tuples:
        effective = default_level
        if section_id and section_id in sec_perms_map:
            effective = max(effective, sec_perms_map[section_id])
        if doc_id and doc_id in doc_perms_map:
            effective = max(effective, doc_perms_map[doc_id])
        if effective >= _level("read"):
            visible.append(doc_id)
    return visible
