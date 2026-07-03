from __future__ import annotations

import time

from livekit.api import (
    AccessToken,
    LiveKitAPI,
    VideoGrants,
)
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.errors import (
    NotFoundError,
    PermissionDeniedError,
    ServiceUnavailableError,
)
from core.logging import get_logger
from models import User
from repositories.rooms import RoomsRepository
from schemas.livekit import EgressStartResponse, LiveKitTokenResponse

try:
    from livekit.protocol.egress import (
        EncodedFileOutput,
        EncodedFileType,
        RoomCompositeEgressRequest as _EgressRequest,
        StopEgressRequest,
    )
except ImportError:  # pragma: no cover - older livekit-api
    from livekit.protocol.egress import (  # type: ignore[no-redef]
        EncodedFileOutput,
        EncodedFileType,
        StartRoomCompositeEgressRequest as _EgressRequest,  # type: ignore[misc]
        StopEgressRequest,
    )

from livekit.protocol.egress import EgressInfo

logger = get_logger("loshare.livekit")

_EGRESS_NOT_FOUND_HINTS = ("not found", "not_found", "does not exist")


def room_name(room_id: int) -> str:
    return f"loshare-{room_id}"


def build_livekit_client() -> LiveKitAPI:
    return LiveKitAPI(
        url=settings.livekit_api_url,
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )


def _is_not_found_error(exc: BaseException) -> bool:
    text = (str(exc) or "").lower()
    return any(hint in text for hint in _EGRESS_NOT_FOUND_HINTS)


class LiveKitService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._rooms = RoomsRepository(db)

    async def create_access_token(self, *, room_id: int, user: User) -> LiveKitTokenResponse:
        if not await self._rooms.is_member(room_id=room_id, user_id=user.id):
            raise PermissionDeniedError("您不在该房间中")

        token = (
            AccessToken(
                api_key=settings.livekit_api_key, api_secret=settings.livekit_api_secret
            )
            .with_identity(str(user.id))
            .with_name(user.username)
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=room_name(room_id),
                    can_publish=True,
                    can_subscribe=True,
                )
            )
        )
        return LiveKitTokenResponse(
            token=token.to_jwt(),
            url=settings.livekit_ws_url,
            room_name=room_name(room_id),
        )

    async def start_egress(self, *, room_id: int, user: User) -> EgressStartResponse:
        if not await self._rooms.is_member(room_id=room_id, user_id=user.id):
            raise PermissionDeniedError("您不在该房间中")

        name = room_name(room_id)
        filepath = f"/recordings/{name}-{int(time.time())}.mp4"

        try:
            async with build_livekit_client() as lk:
                req = _EgressRequest(
                    room_name=name,
                    layout="speaker-dark",
                    file=EncodedFileOutput(
                        file_type=EncodedFileType.MP4,
                        filepath=filepath,
                    ),
                )
                info: EgressInfo = await lk.egress.start_room_composite_egress(req)
        except Exception as exc:
            logger.exception(
                "egress_start_failed",
                extra={"room_id": room_id, "user_id": user.id, "error": str(exc)},
            )
            raise ServiceUnavailableError("录制服务暂不可用，请稍后重试") from exc

        return EgressStartResponse(egress_id=info.egress_id, filepath=filepath)

    async def stop_egress(self, *, egress_id: str) -> None:
        try:
            async with build_livekit_client() as lk:
                await lk.egress.stop_egress(StopEgressRequest(egress_id=egress_id))
        except Exception as exc:
            if _is_not_found_error(exc):
                logger.info(
                    "egress_stop_not_found",
                    extra={"egress_id": egress_id, "error": str(exc)},
                )
                raise NotFoundError("录制任务不存在或已结束") from exc
            logger.exception(
                "egress_stop_failed",
                extra={"egress_id": egress_id, "error": str(exc)},
            )
            raise ServiceUnavailableError("停止录制失败，请稍后重试") from exc
