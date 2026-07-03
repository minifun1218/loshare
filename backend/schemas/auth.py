from __future__ import annotations

import re
from datetime import datetime

from pydantic import ConfigDict, EmailStr, field_validator

from schemas.common import _StrictModel


_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$")
_CODE_RE = re.compile(r"^\d{6}$")


class SendCodeRequest(_StrictModel):
    email: EmailStr


class ResendVerificationRequest(_StrictModel):
    email: EmailStr


class UserRegister(_StrictModel):
    username: str
    email: EmailStr
    password: Annotated[str, ...]  # 长度约束见 validator
    code: str

    @field_validator("username")
    @classmethod
    def _validate_username(cls, v: str) -> str:
        if not _USERNAME_RE.match(v):
            raise ValueError("用户名需 2-20 字符，支持字母/数字/下划线/中文")
        return v

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("密码至少 6 位")
        if len(v) > 128:
            raise ValueError("密码最多 128 位")
        return v

    @field_validator("code")
    @classmethod
    def _validate_code(cls, v: str) -> str:
        if not _CODE_RE.match(v.strip()):
            raise ValueError("验证码为 6 位数字")
        return v.strip()


class UserLogin(_StrictModel):
    username: str
    password: str


class UserOut(_StrictModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int
    username: str
    email: str
    avatar_color: str
    is_verified: bool
    created_at: datetime


class Token(_StrictModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class VerifyEmailResponse(_StrictModel):
    message: str
    verified: bool = True