from __future__ import annotations

from fastapi import APIRouter, Query

from auth import CurrentUser
from database import DbSession
from schemas.livekit import (
    EgressStartRequest,
    EgressStartResponse,
    EgressStopResponse,
    LiveKitTokenResponse,
)
from services.livekit import LiveKitService

router = APIRouter(prefix="/api/livekit", tags=["livekit"])


@router.get("/token", response_model=LiveKitTokenResponse)
async def get_token(
    room_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> LiveKitTokenResponse:
    return await LiveKitService(db).create_access_token(
        room_id=room_id, user=current_user
    )


@router.post("/egress/start", response_model=EgressStartResponse)
async def start_egress(
    body: EgressStartRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> EgressStartResponse:
    return await LiveKitService(db).start_egress(
        room_id=body.room_id, user=current_user
    )


@router.delete("/egress/{egress_id}", response_model=EgressStopResponse)
async def stop_egress(
    egress_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> EgressStopResponse:
    await LiveKitService(db).stop_egress(egress_id=egress_id)
    return EgressStopResponse(message="录制已停止")
