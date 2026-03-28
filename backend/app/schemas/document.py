from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    section_id: str
    slug: Optional[str] = None
    content: str = ""
    order: int = 0
    is_published: bool = True


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    section_id: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None
    is_published: Optional[bool] = None


class DocumentOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    section_id: str
    slug: str
    content: str
    order: int
    version: str = ""
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentVersionOut(BaseModel):
    id: str
    document_id: str
    version: str
    title: str
    description: Optional[str]
    section_id: str
    slug: str
    content: str
    order: int
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentReorderRequest(BaseModel):
    section_id: str
    ids: List[str]
