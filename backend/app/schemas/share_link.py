from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ShareLinkCreate(BaseModel):
    document_id: Optional[str] = None
    section_id: Optional[str] = None
    permission: str  # "read" | "write"
    expires_in_seconds: Optional[int] = None  # null = never
    max_uses: Optional[int] = None


class ShareLinkOut(BaseModel):
    id: str
    token: str
    document_id: Optional[str] = None
    section_id: Optional[str] = None
    permission: str
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    use_count: int
    created_by: str
    created_at: datetime
    last_accessed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
