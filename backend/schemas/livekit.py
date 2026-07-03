from __future__ import annotations

from pydantic import Field

from schemas.common import _StrictModel


class LiveKitTokenResponse(_StrictModel):
    token: str
    url: str
    room_name: str


class EgressStartRequest(_StrictModel):
    room_id: int = Field(gt=0)


class EgressStartResponse(_StrictModel):
    egress_id: str
    filepath: str


class EgressStopResponse(_StrictModel):
    message: str