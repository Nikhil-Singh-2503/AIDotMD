from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PermissionCreate(BaseModel):
    user_id: str
    document_id: Optional[str] = None
    section_id: Optional[str] = None
    permission: str  # "read" | "write" | "admin"


class PermissionUpdate(BaseModel):
    permission: str


class PermissionOut(BaseModel):
    id: str
    user_id: str
    user_display_name: Optional[str] = None
    document_id: Optional[str] = None
    section_id: Optional[str] = None
    permission: str
    granted_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
