from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict, field_validator

from schemas.common import _StrictModel


class RoomCreate(_StrictModel):
    name: str

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 50:
            raise ValueError("房间名需 1-50 字符")
        return v


class RoomOut(_StrictModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int
    name: str
    code: str
    owner_id: int
    created_at: datetime
    member_count: int = 0


class MemberLocation(_StrictModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    user_id: int
    username: str
    avatar_color: str
    latitude: float
    longitude: float
    accuracy: float | None
    updated_at: datetime