import os
import httpx
from datetime import datetime, timedelta
from typing import Optional
from ..config import get_settings

settings = get_settings()

_cache: Optional[dict] = None
_cache_time: Optional[datetime] = None
CACHE_TTL = timedelta(hours=1)


def detect_deployment() -> str:
    if os.path.exists("/.dockerenv"):
        return "docker"
    if os.getenv("AIDOTMD_DEPLOYMENT") == "docker":
        return "docker"
    return "source"


def get_current_version() -> dict:
    return {
        "version": settings.VERSION,
        "build": settings.BUILD,
        "deployment": detect_deployment(),
    }


def _is_cache_valid() -> bool:
    global _cache, _cache_time
    if _cache is None or _cache_time is None:
        return False
    return datetime.now() - _cache_time < CACHE_TTL


async def check_for_updates(include_prerelease: bool = False) -> dict:
    global _cache, _cache_time

    if _is_cache_valid() and _cache:
        return _cache

    current_version = settings.VERSION
    github_repo = settings.GITHUB_REPO

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://api.github.com/repos/{github_repo}/releases"
            headers = {"Accept": "application/vnd.github+json"}

            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                releases = response.json()

                if not include_prerelease:
                    releases = [r for r in releases if not r.get("prerelease", False)]

                if releases:
                    latest = releases[0]
                    latest_version = latest.get("tag_name", "").lstrip("v")

                    is_major = False
                    if latest_version and current_version:
                        try:
                            current_parts = [
                                int(x) for x in current_version.split(".")[:3]
                            ]
                            latest_parts = [
                                int(x) for x in latest_version.split(".")[:3]
                            ]
                            if len(latest_parts) > 0 and len(current_parts) > 0:
                                is_major = latest_parts[0] > current_parts[0]
                        except:
                            pass

                    update_available = latest_version != current_version

                    result = {
                        "current": current_version,
                        "latest": latest_version,
                        "update_available": update_available,
                        "is_major": is_major,
                        "last_checked": datetime.now().isoformat(),
                        "changelog_url": latest.get("html_url", ""),
                        "deployment_method": detect_deployment(),
                    }

                    _cache = result
                    _cache_time = datetime.now()

                    return result
    except Exception as e:
        pass

    return {
        "current": current_version,
        "latest": current_version,
        "update_available": False,
        "is_major": False,
        "last_checked": datetime.now().isoformat(),
        "changelog_url": "",
        "deployment_method": detect_deployment(),
    }


async def get_changelog(version: str) -> dict:
    github_repo = settings.GITHUB_REPO

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://api.github.com/repos/{github_repo}/releases/tags/v{version}"
            headers = {"Accept": "application/vnd.github+json"}

            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                release = response.json()
                return {
                    "version": version,
                    "released_at": release.get("created_at", ""),
                    "body": release.get("body", ""),
                    "html_url": release.get("html_url", ""),
                }
    except Exception as e:
        pass

    return {"version": version, "released_at": "", "body": "", "html_url": ""}


def clear_cache():
    global _cache, _cache_time
    _cache = None
    _cache_time = None
