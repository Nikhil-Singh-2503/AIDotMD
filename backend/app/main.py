from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.db import init_db
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
)
from app.services import settings_service
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
    # Start fastmcp's internal session manager / task groups
    async with mcp_app.lifespan(mcp_app):
        yield


app = FastAPI(title="AIDotMd API", version="1.0.0", lifespan=combined_lifespan)

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
async def share_token_middleware(request: Request, call_next):
    is_api = request.url.path.startswith("/api/v1/")
    
    # If not an API request, let it pass (static files, /mcp, etc)
    if not is_api:
        return await call_next(request)

    # Exemption for specific write paths
    if request.method in _WRITE_METHODS and any(
        request.url.path.startswith(p) for p in _WRITE_EXEMPT_PREFIXES
    ):
        return await call_next(request)

    # If it's a GET request, check if it's in the public whitelist
    if request.method == "GET":
        if any(request.url.path.startswith(p) for p in _PUBLIC_GET_PREFIXES):
            return await call_next(request)

    # For all other requests (unlisted GETs, and all non-exempt WRITEs), require auth:
    host = request.headers.get("host", "").split(":")[0]
    is_local = host in _LOCAL_HOSTS

    # Local admin — full access
    if is_local:
        return await call_next(request)

    # Non-local → require valid share edit token
    stored = settings_service.get_share_token()
    token = request.headers.get("x-share-token", "")
    if not token or token != stored:
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)


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


@app.get("/health")
async def health():
    return {"status": "ok"}
