from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.services import nav_service

router = APIRouter(prefix="/api/v1/nav", tags=["navigation"])


@router.get("/tree")
async def get_nav_tree(db: AsyncSession = Depends(get_db)):
    return await nav_service.get_tree(db)


@router.get("/sidebar")
async def get_sidebar_config(db: AsyncSession = Depends(get_db)):
    return await nav_service.get_sidebar_config(db)
