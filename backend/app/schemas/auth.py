from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    display_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    is_service_account: bool
    has_mcp_key: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMcpKeyOut(BaseModel):
    mcp_key: str


class CreateUserResponse(BaseModel):
    user: UserOut
    mcp_key: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class CreateUserRequest(BaseModel):
    email: str
    display_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6)
    role: str = "editor"


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
