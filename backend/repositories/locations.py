from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Location, RoomMember, User


class LocationsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get(self, *, user_id: int, room_id: int) -> Location | None:
        result = await self._db.execute(
            select(Location).where(
                Location.user_id == user_id, Location.room_id == room_id
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        user_id: int,
        room_id: int,
        latitude: float,
        longitude: float,
        accuracy: float | None,
    ) -> Location:
        loc = await self.get(user_id=user_id, room_id=room_id)
        if loc is None:
            loc = Location(
                user_id=user_id,
                room_id=room_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
            )
            self._db.add(loc)
        else:
            loc.latitude = latitude
            loc.longitude = longitude
            loc.accuracy = accuracy
        await self._db.flush()
        await self._db.refresh(loc)
        return loc

    async def list_for_room(self, room_id: int) -> list[tuple[User, Location]]:
        stmt = (
            select(User, Location)
            .join(RoomMember, RoomMember.user_id == User.id)
            .outerjoin(
                Location,
                (Location.user_id == User.id) & (Location.room_id == room_id),
            )
            .where(RoomMember.room_id == room_id)
        )
        result = await self._db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]


__all__ = ["LocationsRepository", "datetime"]