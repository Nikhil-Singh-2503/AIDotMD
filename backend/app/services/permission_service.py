from fastapi import HTTPException, Request

_WRITE_ROLES = {"admin", "editor"}
_ADMIN_ROLES = {"admin"}


async def require_write_permission(request: Request) -> None:
    user = getattr(request.state, "user", None)
    if user is None:
        return
    if user.role not in _WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Viewer role does not have write permission")


async def require_admin_permission(request: Request) -> None:
    user = getattr(request.state, "user", None)
    if user is None:
        return
    if user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
