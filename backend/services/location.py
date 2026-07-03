from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import PermissionDeniedError
from models import User
from repositories.locations import LocationsRepository
from repositories.rooms import RoomsRepository
from schemas.location import LocationUpdate


class LocationsService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._rooms = RoomsRepository(db)
        self._locations = LocationsRepository(db)

    async def update(self, *, body: LocationUpdate, user: User):
        if not await self._rooms.can_view(room_id=body.room_id, user_id=user.id):
            raise PermissionDeniedError("您无权查看该房间")

        loc = await self._locations.upsert(
            user_id=user.id,
            room_id=body.room_id,
            latitude=body.latitude,
            longitude=body.longitude,
            accuracy=body.accuracy,
        )
        await self._db.commit()
        return loc

    async def assert_can_view(self, *, room_id: int, user: User) -> None:
        if not await self._rooms.can_view(room_id=room_id, user_id=user.id):
            raise PermissionDeniedError("您无权查看该房间")

    async def user_from_token(self, *, token: str) -> User | None:
        from auth import decode_token
        from jose import JWTError

        try:
            user_id = decode_token(token)
        except JWTError:
            return None
        from repositories.users import UsersRepository

        return await UsersRepository(self._db).get_by_id(user_id)
