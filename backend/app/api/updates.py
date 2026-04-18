from fastapi import APIRouter
from app.services import update_service

router = APIRouter()


@router.get("/version")
def get_version():
    return update_service.get_current_version()


@router.get("/updates/check")
async def check_updates(include_prerelease: bool = False):
    return await update_service.check_for_updates(include_prerelease)


@router.get("/updates/changelog/{version}")
async def get_changelog(version: str):
    return await update_service.get_changelog(version)


@router.post("/updates/clear-cache")
def clear_cache():
    update_service.clear_cache()
    return {"status": "cache cleared"}
