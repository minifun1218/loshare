from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import (
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
)
from models import ShareRoom, User
from repositories.rooms import RoomsRepository
from schemas.rooms import MemberLocation, RoomCreate, RoomOut


def _to_room_out(room: ShareRoom, member_count: int) -> RoomOut:
    return RoomOut(
        id=room.id,
        name=room.name,
        code=room.code,
        owner_id=room.owner_id,
        created_at=room.created_at,
        member_count=member_count,
    )


class RoomsService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._rooms = RoomsRepository(db)

    async def create(self, *, body: RoomCreate, owner: User) -> RoomOut:
        code = await self._rooms.find_unique_code()
        room = await self._rooms.create(name=body.name, code=code, owner_id=owner.id)
        await self._rooms.add_member(room_id=room.id, user_id=owner.id)
        await self._db.commit()
        return _to_room_out(room, member_count=1)

    async def join(self, *, code: str, user: User) -> RoomOut:
        room = await self._rooms.get_by_code(code.upper())
        if room is None:
            raise NotFoundError("房间不存在或已关闭")
        if await self._rooms.is_member(room_id=room.id, user_id=user.id):
            raise BadRequestError("您已在该房间中")
        await self._rooms.add_member(room_id=room.id, user_id=user.id)
        await self._db.commit()
        member_count = await self._rooms.count_members(room.id)
        return _to_room_out(room, member_count=member_count)

    async def list_for_user(self, *, user: User) -> list[RoomOut]:
        results = await self._rooms.list_for_user(user.id)
        return [_to_room_out(room, count) for room, count in results]

    async def list_member_locations(
        self, *, room_id: int, user: User
    ) -> list[MemberLocation]:
        if not await self._rooms.is_member(room_id=room_id, user_id=user.id):
            raise PermissionDeniedError("您不在该房间中")

        from repositories.locations import LocationsRepository

        rows = await LocationsRepository(self._db).list_for_room(room_id)
        return [
            MemberLocation(
                user_id=u.id,
                username=u.username,
                avatar_color=u.avatar_color,
                latitude=loc.latitude,
                longitude=loc.longitude,
                accuracy=loc.accuracy,
                updated_at=loc.updated_at,
            )
            for u, loc in rows
            if loc is not None
        ]

    async def leave(self, *, room_id: int, user: User) -> None:
        removed = await self._rooms.remove_member(room_id=room_id, user_id=user.id)
        if not removed:
            raise NotFoundError("您不在该房间中")
        await self._db.commit()