from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class SectionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    order: int = 0


class SectionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    order: Optional[int] = None


class SectionOut(BaseModel):
    id: str
    title: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    order: int
    version: str = ""
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SectionVersionOut(BaseModel):
    id: str
    section_id: str
    version: str
    title: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    ids: List[str]
