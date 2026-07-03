from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import User


class UsersRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self._db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def add(
        self,
        *,
        username: str,
        email: str,
        hashed_password: str,
        avatar_color: str,
        is_verified: bool = False,
    ) -> User:
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            avatar_color=avatar_color,
            is_verified=is_verified,
        )
        self._db.add(user)
        await self._db.flush()
        await self._db.refresh(user)
        return user

    async def mark_verified(self, user: User) -> None:
        user.is_verified = True
        await self._db.flush()