from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from core.logging import get_logger

logger = get_logger("loshare.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[int, dict[int, WebSocket]] = {}
        self._locks: dict[int, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def _lock_for(self, room_id: int) -> asyncio.Lock:
        async with self._global_lock:
            lock = self._locks.get(room_id)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[room_id] = lock
            return lock

    def connect(self, room_id: int, user_id: int, ws: WebSocket) -> None:
        room = self._rooms.setdefault(room_id, {})
        room[user_id] = ws

    def disconnect(self, room_id: int, user_id: int) -> None:
        room = self._rooms.get(room_id)
        if not room:
            return
        room.pop(user_id, None)
        if not room:
            del self._rooms[room_id]
            self._locks.pop(room_id, None)

    async def broadcast(
        self,
        room_id: int,
        message: dict[str, Any],
        *,
        exclude_user: int | None = None,
    ) -> int:
        lock = await self._lock_for(room_id)
        async with lock:
            members = self._rooms.get(room_id, {})
            payload = json.dumps(message, ensure_ascii=False, default=str)
            delivered = 0
            for uid, ws in list(members.items()):
                if uid == exclude_user:
                    continue
                if ws.client_state != WebSocketState.CONNECTED:
                    members.pop(uid, None)
                    continue
                try:
                    await ws.send_text(payload)
                    delivered += 1
                except Exception as exc:
                    logger.warning(
                        "ws_send_failed",
                        extra={
                            "room_id": room_id,
                            "user_id": uid,
                            "error": str(exc),
                        },
                    )
                    members.pop(uid, None)
            return delivered

    async def send_to_user(
        self, room_id: int, user_id: int, message: dict[str, Any]
    ) -> bool:
        lock = await self._lock_for(room_id)
        async with lock:
            ws = self._rooms.get(room_id, {}).get(user_id)
            if ws is None or ws.client_state != WebSocketState.CONNECTED:
                return False
            payload = json.dumps(message, ensure_ascii=False, default=str)
            try:
                await ws.send_text(payload)
                return True
            except Exception as exc:
                logger.warning(
                    "ws_send_failed",
                    extra={
                        "room_id": room_id,
                        "user_id": user_id,
                        "error": str(exc),
                    },
                )
                self.disconnect(room_id, user_id)
                return False

    def online_users(self, room_id: int) -> list[int]:
        return list(self._rooms.get(room_id, {}).keys())

    def is_online(self, room_id: int, user_id: int) -> bool:
        return user_id in self._rooms.get(room_id, {})

    def room_count(self) -> int:
        return len(self._rooms)


manager = ConnectionManager()