from __future__ import annotations

import random
import string

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import RoomMember, ShareRoom

_CODE_ALPHABET = string.ascii_uppercase + string.digits
_CODE_LEN = 6
_CODE_RETRY = 10


def generate_room_code() -> str:
    return "".join(random.choices(_CODE_ALPHABET, k=_CODE_LEN))


class RoomsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def code_exists(self, code: str) -> bool:
        result = await self._db.execute(
            select(ShareRoom.id).where(ShareRoom.code == code)
        )
        return result.scalar_one_or_none() is not None

    async def find_unique_code(self) -> str:
        for _ in range(_CODE_RETRY):
            code = generate_room_code()
            if not await self.code_exists(code):
                return code
        raise RuntimeError("无法生成唯一房间码，请重试")

    async def create(self, *, name: str, code: str, owner_id: int) -> ShareRoom:
        room = ShareRoom(name=name, code=code, owner_id=owner_id)
        self._db.add(room)
        await self._db.flush()
        await self._db.refresh(room)
        return room

    async def get_by_code(self, code: str) -> ShareRoom | None:
        result = await self._db.execute(
            select(ShareRoom).where(
                ShareRoom.code == code, ShareRoom.is_active.is_(True)
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, room_id: int) -> ShareRoom | None:
        result = await self._db.execute(
            select(ShareRoom).where(ShareRoom.id == room_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: int) -> list[tuple[ShareRoom, int]]:
        stmt = (
            select(
                ShareRoom,
                func.count(RoomMember.id),
            )
            .join(RoomMember, RoomMember.room_id == ShareRoom.id)
            .where(RoomMember.user_id == user_id, ShareRoom.is_active.is_(True))
            .group_by(ShareRoom.id)
            .order_by(ShareRoom.created_at.desc())
        )
        result = await self._db.execute(stmt)
        return [(row[0], int(row[1])) for row in result.all()]

    async def add_member(self, *, room_id: int, user_id: int) -> None:
        member = RoomMember(room_id=room_id, user_id=user_id)
        self._db.add(member)
        await self._db.flush()

    async def remove_member(self, *, room_id: int, user_id: int) -> bool:
        result = await self._db.execute(
            delete(RoomMember).where(
                and_(
                    RoomMember.room_id == room_id,
                    RoomMember.user_id == user_id,
                )
            )
        )
        return (result.rowcount or 0) > 0

    async def count_members(self, room_id: int) -> int:
        result = await self._db.execute(
            select(func.count(RoomMember.id)).where(RoomMember.room_id == room_id)
        )
        return int(result.scalar() or 0)

    async def is_member(self, *, room_id: int, user_id: int) -> bool:
        result = await self._db.execute(
            select(RoomMember.id).where(
                RoomMember.room_id == room_id, RoomMember.user_id == user_id
            )
        )
        return result.scalar_one_or_none() is not None

    async def member_exists(self, *, room_id: int, user_id: int) -> bool:
        return await self.is_member(room_id=room_id, user_id=user_id)