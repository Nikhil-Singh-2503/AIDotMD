"""
Runtime settings service — reads/writes data/aidotmd.config.json.

This config file lives inside the Docker volume (./data/) so settings
persist across container restarts without needing to rebuild the image.
Env vars always take precedence over this file at process start, but
values saved here are returned by the /api/v1/settings endpoint and
shown in the UI.
"""
import json
import secrets
from pathlib import Path

from app.config import get_settings

_CONFIG_FILENAME = "aidotmd.config.json"


def _config_path() -> Path:
    return Path(get_settings().DATA_DIR) / _CONFIG_FILENAME


def read_config() -> dict:
    path = _config_path()
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return {}
    return {}


def write_config(updates: dict) -> None:
    path = _config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = read_config()
    existing.update({k: v for k, v in updates.items() if v is not None})
    path.write_text(json.dumps(existing, indent=2))


def ensure_mcp_key() -> str:
    """
    Called at app startup. Generates an MCP API key the first time
    and persists it to aidotmd.config.json so it survives restarts.
    """
    config = read_config()
    key = config.get("MCP_API_KEY", "")
    if not key:
        key = f"dm_live_{secrets.token_urlsafe(32)}"
        write_config({"MCP_API_KEY": key})
    return key


def get_mcp_key() -> str:
    return read_config().get("MCP_API_KEY", "")


def regenerate_mcp_key() -> str:
    key = f"dm_live_{secrets.token_urlsafe(32)}"
    write_config({"MCP_API_KEY": key})
    return key


def ensure_share_token() -> str:
    """
    Called at app startup. Generates a share edit token the first time
    and persists it to aidotmd.config.json so it survives restarts.
    """
    config = read_config()
    token = config.get("SHARE_EDIT_TOKEN", "")
    if not token:
        token = f"dm_share_{secrets.token_urlsafe(32)}"
        write_config({"SHARE_EDIT_TOKEN": token})
    return token


def get_share_token() -> str:
    return read_config().get("SHARE_EDIT_TOKEN", "")
