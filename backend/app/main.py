from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.db import init_db, SessionLocal
from app.config import get_settings
from app.api import (
    sections,
    documents,
    upload,
    nav,
    search,
    settings as settings_router,
    stream as stream_router,
    meta as meta_router,
    trash,
    updates as updates_router,
    auth as auth_router,
    admin_users,
)
from app.services import settings_service, auth_service, user_service
from app.mcp.server import mcp

_settings = get_settings()

# Build MCP ASGI app — mounted at /mcp, so clients connect to <base_url>/mcp
mcp_app = mcp.http_app(path="/")


@asynccontextmanager
async def combined_lifespan(app: FastAPI):
    # App startup
    await init_db()
    Path(_settings.DOCS_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    Path(_settings.STATIC_DIR).mkdir(parents=True, exist_ok=True)
    Path(_settings.DATA_DIR).mkdir(parents=True, exist_ok=True)
    settings_service.ensure_mcp_key()
    settings_service.ensure_share_token()

    # Ensure admin user (first-run) and MCP service account
    async with SessionLocal() as db:
        await user_service.ensure_admin_user(db)
        await user_service.ensure_mcp_user(db)

    # Start fastmcp's internal session manager / task groups
    async with mcp_app.lifespan(mcp_app):
        yield


app = FastAPI(title="AIDotMd API", version=_settings.VERSION, lifespan=combined_lifespan)

_WRITE_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
# Write paths that are exempt (SSE commits happen via POST but from the MCP agent
# which has its own auth; /mcp/* is handled separately below)
_WRITE_EXEMPT_PREFIXES = ("/api/v1/docs/",)  # SSE stream commits

# Read paths that are completely public (for the public-facing documentation viewer)
_PUBLIC_GET_PREFIXES = (
    "/api/v1/nav/tree",
    "/api/v1/search",
    "/api/v1/documents/by-slug",
    "/api/v1/meta",
)

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    api_path = request.url.path

    # Public paths — no auth required
    if api_path.startswith("/api/v1/auth/login") or api_path.startswith("/api/v1/auth/me"):
        return await call_next(request)

    # Non-API paths — let through (static, MCP, etc)
    if not api_path.startswith("/api/v1/"):
        return await call_next(request)

    # Public GET endpoints
    if request.method == "GET" and any(
        api_path.startswith(p) for p in _PUBLIC_GET_PREFIXES
    ):
        return await call_next(request)

    # Auth endpoints (register, change-password, logout) require a valid user
    if api_path.startswith("/api/v1/auth/"):
        return await call_next(request)

    # Admin user endpoints
    if api_path.startswith("/api/v1/admin/users"):
        return await call_next(request)

    # Check for valid session token
    auth_header = request.headers.get("authorization", "")
    token = ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.cookies.get("aidotmd_session", "")

    if token:
        async with SessionLocal() as db:
            session = await auth_service.get_session_by_token(db, token)
            if session:
                user = await user_service.get_by_id(db, session.user_id)
                if user and user.is_active:
                    request.state.user = user
                    return await call_next(request)

    # Fall back to share token (backward compatibility for remote editors)
    host = request.headers.get("host", "").split(":")[0]
    if host in _LOCAL_HOSTS:
        return await call_next(request)

    stored_share = settings_service.get_share_token()
    share_token = request.headers.get("x-share-token", "")
    if share_token and share_token == stored_share:
        return await call_next(request)

    return JSONResponse({"detail": "Unauthorized"}, status_code=401)


# ── MCP auth middleware ────────────────────────────────────────────────────────
# Validates Bearer token for all requests to /mcp/*

@app.middleware("http")
async def mcp_auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/mcp"):
        stored_key = settings_service.get_mcp_key()

        # Accept key from Authorization header OR ?api_key= query param
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
        else:
            token = request.query_params.get("api_key", "")

        if not token:
            return JSONResponse(
                {
                    "error": "Unauthorized — provide Authorization: Bearer <key> header or ?api_key=<key>"
                },
                status_code=401,
            )
        if not stored_key or token != stored_key:
            return JSONResponse({"error": "Invalid API key"}, status_code=401)
    return await call_next(request)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ──────────────────────────────────────────────────────────────

Path(_settings.STATIC_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/static/img", StaticFiles(directory=_settings.STATIC_DIR), name="static")

# ── MCP server ────────────────────────────────────────────────────────────────

app.mount("/mcp", mcp_app)

# ── REST API routers ──────────────────────────────────────────────────────────

app.include_router(sections.router)
app.include_router(documents.router)
app.include_router(upload.router)
app.include_router(nav.router)
app.include_router(search.router)
app.include_router(settings_router.router)
app.include_router(stream_router.router)
app.include_router(trash.router)
app.include_router(meta_router.router, prefix="/api/v1")
app.include_router(updates_router.router, prefix="/api/v1")
app.include_router(auth_router.router)
app.include_router(admin_users.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
