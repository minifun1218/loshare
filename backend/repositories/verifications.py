from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import EmailVerification, VerificationCode


class VerificationsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def invalidate_codes_for_email(self, email: str) -> int:
        result = await self._db.execute(
            select(VerificationCode).where(
                VerificationCode.email == email,
                VerificationCode.used.is_(False),
            )
        )
        codes = result.scalars().all()
        for c in codes:
            c.used = True
        return len(codes)

    async def create_code(self, *, email: str, code: str, expires_at: datetime) -> VerificationCode:
        record = VerificationCode(email=email, code=code, expires_at=expires_at)
        self._db.add(record)
        await self._db.flush()
        return record

    async def find_active_code(self, *, email: str, code: str) -> VerificationCode | None:
        result = await self._db.execute(
            select(VerificationCode).where(
                and_(
                    VerificationCode.email == email,
                    VerificationCode.code == code,
                    VerificationCode.used.is_(False),
                )
            )
        )
        return result.scalar_one_or_none()

    async def mark_code_used(self, code: VerificationCode) -> None:
        code.used = True
        await self._db.flush()

    async def invalidate_tokens_for_user(self, user_id: int) -> int:
        result = await self._db.execute(
            select(EmailVerification).where(
                EmailVerification.user_id == user_id,
                EmailVerification.used.is_(False),
            )
        )
        tokens = result.scalars().all()
        for t in tokens:
            t.used = True
        return len(tokens)

    async def create_email_verification(
        self, *, user_id: int, token: str, expires_at: datetime
    ) -> EmailVerification:
        record = EmailVerification(
            user_id=user_id, token=token, expires_at=expires_at
        )
        self._db.add(record)
        await self._db.flush()
        return record

    async def find_email_verification(self, token: str) -> EmailVerification | None:
        result = await self._db.execute(
            select(EmailVerification).where(EmailVerification.token == token)
        )
        return result.scalar_one_or_none()

    async def mark_email_verification_used(self, record: EmailVerification) -> None:
        record.used = True
        await self._db.flush()