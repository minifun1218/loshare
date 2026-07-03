from __future__ import annotations

from pydantic import ConfigDict, Field

from schemas.common import _StrictModel


class LocationUpdate(_StrictModel):
    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90.0, le=90.0, description="纬度，范围 -90 到 90")
    longitude: float = Field(ge=-180.0, le=180.0, description="经度，范围 -180 到 180")
    accuracy: float | None = Field(default=None, ge=0.0)
    room_id: int = Field(gt=0, description="房间 ID")