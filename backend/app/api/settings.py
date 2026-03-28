from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.services import settings_service

router = APIRouter(prefix="/api/v1", tags=["settings"])


# ── Response / Request schemas ────────────────────────────────────────────────

class SettingsResponse(BaseModel):
    database_url: str
    storage_backend: str
    s3_bucket: str
    s3_region: str
    s3_endpoint_url: str
    s3_access_key_id: str
    s3_secret_access_key_set: bool   # never expose the actual secret
    mcp_api_key: str
    share_edit_token: str
    data_dir: str
    base_url: str
    use_public_url: bool


class UpdateSettingsRequest(BaseModel):
    database_url: Optional[str] = None
    storage_backend: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    s3_endpoint_url: Optional[str] = None
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None  # only written if provided
    base_url: Optional[str] = None
    use_public_url: Optional[bool] = None


class UpdateSettingsResponse(BaseModel):
    status: str
    restart_required: bool


class TestStorageResponse(BaseModel):
    success: bool
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint():
    """Return current configuration (secrets masked)."""
    env = get_settings()
    cfg = settings_service.read_config()

    def _get(key: str, fallback: str) -> str:
        return cfg.get(key, fallback) or fallback

    return SettingsResponse(
        database_url=_get("DATABASE_URL", env.DATABASE_URL),
        storage_backend=_get("STORAGE_BACKEND", env.STORAGE_BACKEND),
        s3_bucket=_get("S3_BUCKET", env.S3_BUCKET),
        s3_region=_get("S3_REGION", env.S3_REGION),
        s3_endpoint_url=_get("S3_ENDPOINT_URL", env.S3_ENDPOINT_URL),
        s3_access_key_id=_get("S3_ACCESS_KEY_ID", env.S3_ACCESS_KEY_ID),
        s3_secret_access_key_set=bool(
            cfg.get("S3_SECRET_ACCESS_KEY") or env.S3_SECRET_ACCESS_KEY
        ),
        mcp_api_key=_get("MCP_API_KEY", env.MCP_API_KEY),
        share_edit_token=settings_service.get_share_token(),
        data_dir=env.DATA_DIR,
        base_url=_get("BASE_URL", env.BASE_URL),
        use_public_url=bool(cfg.get("USE_PUBLIC_URL", env.USE_PUBLIC_URL)),
    )


@router.put("/settings", response_model=UpdateSettingsResponse)
async def update_settings(body: UpdateSettingsRequest):
    """Save configuration to data/aidotmd.config.json."""
    updates: dict = {}

    if body.database_url is not None:
        updates["DATABASE_URL"] = body.database_url
    if body.storage_backend is not None:
        updates["STORAGE_BACKEND"] = body.storage_backend
    if body.s3_bucket is not None:
        updates["S3_BUCKET"] = body.s3_bucket
    if body.s3_region is not None:
        updates["S3_REGION"] = body.s3_region
    if body.s3_endpoint_url is not None:
        updates["S3_ENDPOINT_URL"] = body.s3_endpoint_url
    if body.s3_access_key_id is not None:
        updates["S3_ACCESS_KEY_ID"] = body.s3_access_key_id
    if body.s3_secret_access_key is not None:
        updates["S3_SECRET_ACCESS_KEY"] = body.s3_secret_access_key
    if body.base_url is not None:
        updates["BASE_URL"] = body.base_url
    if body.use_public_url is not None:
        updates["USE_PUBLIC_URL"] = body.use_public_url

    settings_service.write_config(updates)

    # DB URL changes require a container restart to take effect
    restart_required = "DATABASE_URL" in updates
    return UpdateSettingsResponse(status="saved", restart_required=restart_required)


@router.post("/settings/regenerate-key")
async def regenerate_mcp_key():
    """Generate a new MCP API key and persist it."""
    key = settings_service.regenerate_mcp_key()
    return {"mcp_api_key": key}


@router.post("/settings/test-storage", response_model=TestStorageResponse)
async def test_storage_connection(body: UpdateSettingsRequest):
    """
    Quick validation of S3/R2 credentials by attempting a
    small test write + delete before the user saves.
    """
    try:
        import aiobotocore.session  # type: ignore
        session = aiobotocore.session.get_session()

        bucket = body.s3_bucket or get_settings().S3_BUCKET
        region = body.s3_region or get_settings().S3_REGION
        access_key = body.s3_access_key_id or get_settings().S3_ACCESS_KEY_ID
        cfg = settings_service.read_config()
        secret_key = (
            body.s3_secret_access_key
            or cfg.get("S3_SECRET_ACCESS_KEY")
            or get_settings().S3_SECRET_ACCESS_KEY
        )
        endpoint_url = body.s3_endpoint_url or get_settings().S3_ENDPOINT_URL or None

        kwargs = dict(
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url

        async with session.create_client("s3", **kwargs) as client:
            test_key = "aidotmd/.connection-test"
            await client.put_object(Bucket=bucket, Key=test_key, Body=b"ok")
            await client.delete_object(Bucket=bucket, Key=test_key)

        return TestStorageResponse(success=True, message="Connection successful!")

    except ImportError:
        return TestStorageResponse(
            success=False,
            message="aiobotocore not installed. Add it to requirements.txt to enable S3.",
        )
    except Exception as e:
        return TestStorageResponse(success=False, message=str(e))
