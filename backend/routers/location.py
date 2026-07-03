from __future__ import annotations

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser
from core.errors import (
    APIError,
    ErrorCode,
    ws_send_error_and_close,
)
from core.logging import get_logger
from database import AsyncSessionLocal, DbSession
from schemas.location import LocationUpdate
from services.location import LocationsService
from ws_manager import manager

logger = get_logger("loshare.location")

router = APIRouter(prefix="/api/location", tags=["location"])


@router.post("/update")
async def update_location(body: LocationUpdate, db: DbSession, current_user: CurrentUser):
    loc = await LocationsService(db).update(body=body, user=current_user)
    await manager.broadcast(
        body.room_id,
        {
            "type": "location_update",
            "data": {
                "user_id": current_user.id,
                "username": current_user.username,
                "avatar_color": current_user.avatar_color,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "accuracy": loc.accuracy,
                "updated_at": loc.updated_at.isoformat(),
            },
        },
    )
    return {"status": "ok"}


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(...),
) -> None:
    try:
        async with AsyncSessionLocal() as db:  # type: AsyncSession
            service = LocationsService(db)
            user = await service.user_from_token(token=token)
            if user is None:
                await ws_send_error_and_close(
                    websocket,
                    code=ErrorCode.UNAUTHENTICATED,
                    message="认证失败，请重新登录",
                    close_code=4001,
                )
                return
            try:
                await service.assert_member(room_id=room_id, user=user)
            except APIError as exc:
                await ws_send_error_and_close(
                    websocket,
                    code=exc.code,
                    message=exc.message,
                    close_code=4003,
                )
                return
    except Exception as exc:
        logger.exception(
            "ws_pre_accept_error",
            extra={"room_id": room_id, "error": str(exc)},
        )
        await ws_send_error_and_close(
            websocket,
            code=ErrorCode.INTERNAL,
            message="服务暂不可用，请稍后重试",
            close_code=1011,
        )
        return

    await websocket.accept()
    manager.connect(room_id, user.id, websocket)

    await manager.broadcast(
        room_id,
        {"type": "user_online", "data": {"user_id": user.id, "username": user.username}},
        exclude_user=user.id,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id, user.id)
        await manager.broadcast(
            room_id,
            {"type": "user_offline", "data": {"user_id": user.id, "username": user.username}},
        )
    except Exception as exc:
        logger.warning(
            "ws_unexpected_error",
            extra={"room_id": room_id, "user_id": user.id, "error": str(exc)},
        )
        manager.disconnect(room_id, user.id)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
