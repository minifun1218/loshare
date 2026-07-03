from __future__ import annotations

import random
from datetime import timezone

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import (
    BadRequestError,
    ConflictError,
    PermissionDeniedError,
    UnauthorizedError,
)
from models import User
from repositories.users import UsersRepository
from repositories.verifications import VerificationsRepository
from schemas.auth import Token, UserOut
from services import email as email_service

AVATAR_COLORS = (
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ef4444",
    "#14b8a6",
)

CODE_EXPIRE_MINUTES = 10
TOKEN_EXPIRE_MINUTES = 30


def _random_avatar_color() -> str:
    return random.choice(AVATAR_COLORS)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._users = UsersRepository(db)
        self._verifications = VerificationsRepository(db)

    async def issue_verification_code(
        self, *, email: str, background: BackgroundTasks
    ) -> None:
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise ConflictError("该邮箱已被注册")
        await self._verifications.invalidate_codes_for_email(email)

        code = email_service.generate_code()
        await self._verifications.create_code(
            email=email,
            code=code,
            expires_at=email_service.code_expires_at(CODE_EXPIRE_MINUTES),
        )
        await self._db.commit()
        background.add_task(email_service.send_code_email, to=email, code=code)

    async def register(
        self,
        *,
        username: str,
        email: str,
        password: str,
        code: str,
    ) -> Token:
        if await self._users.get_by_username(username):
            raise ConflictError("用户名已存在")
        if await self._users.get_by_email(email):
            raise ConflictError("邮箱已被注册")

        record = await self._verifications.find_active_code(email=email, code=code)
        if record is None:
            raise BadRequestError("验证码无效，请重新获取")

        now = email_service.utcnow()
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise BadRequestError("验证码已过期，请重新获取")

        await self._verifications.mark_code_used(record)

        from auth import create_access_token, hash_password

        user = await self._users.add(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            avatar_color=_random_avatar_color(),
            is_verified=True,
        )
        await self._db.commit()

        token = create_access_token(user.id)
        return Token(
            access_token=token,
            user=UserOut.model_validate(user),
        )

    async def login(self, *, username: str, password: str) -> Token:
        from auth import create_access_token, verify_password

        user = await self._users.get_by_username(username)
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("用户名或密码错误")
        if not user.is_active:
            raise PermissionDeniedError("账号已被禁用")
        if not user.is_verified:
            raise PermissionDeniedError(
                "EMAIL_NOT_VERIFIED",
                details={"reason": "EMAIL_NOT_VERIFIED"},
            )

        token = create_access_token(user.id)
        return Token(
            access_token=token,
            user=UserOut.model_validate(user),
        )

    async def verify_email_token(self, token: str) -> None:
        record = await self._verifications.find_email_verification(token)
        if record is None or record.used:
            raise BadRequestError("验证链接无效或已使用")
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if email_service.utcnow() > expires_at:
            raise BadRequestError("验证链接已过期，请重新发送")

        await self._verifications.mark_email_verification_used(record)
        user = await self._users.get_by_id(record.user_id)
        if user is not None:
            await self._users.mark_verified(user)
        await self._db.commit()

    async def resend_verification_email(
        self, *, email: str, background: BackgroundTasks
    ) -> None:
        user = await self._users.get_by_email(email)
        if user is None or user.is_verified:
            return
        await self._verifications.invalidate_tokens_for_user(user.id)
        token = email_service.generate_token()
        await self._verifications.create_email_verification(
            user_id=user.id,
            token=token,
            expires_at=email_service.token_expires_at(TOKEN_EXPIRE_MINUTES),
        )
        await self._db.commit()
        background.add_task(
            email_service.send_verification_email,
            to=user.email,
            username=user.username,
            token=token,
        )

    async def get_me(self, user: User) -> UserOut:
        return UserOut.model_validate(user)