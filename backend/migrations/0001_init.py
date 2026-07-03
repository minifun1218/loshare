from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from migrations.runner import Migration, register


@register
class InitSchema(Migration):
    version = "0001"
    name = "init"

    async def up(self, engine: AsyncEngine) -> None:
        async with engine.begin() as conn:
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    hashed_password VARCHAR(255) NOT NULL,
                    avatar_color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    is_verified BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS email_verifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    token VARCHAR(64) NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    used BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS verification_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email VARCHAR(100) NOT NULL,
                    code VARCHAR(6) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS share_rooms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(20) NOT NULL UNIQUE,
                    owner_id INTEGER NOT NULL REFERENCES users(id),
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS room_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id INTEGER NOT NULL REFERENCES share_rooms(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (room_id, user_id)
                )
                """
            ))
            await conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    room_id INTEGER NOT NULL REFERENCES share_rooms(id),
                    latitude FLOAT NOT NULL,
                    longitude FLOAT NOT NULL,
                    accuracy FLOAT,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, room_id)
                )
                """
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_locations_room ON locations(room_id)"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_ver_codes_email ON verification_codes(email)"
            ))


@register
class BackfillIsVerified(Migration):
    version = "0002"
    name = "backfill_is_verified"

    async def up(self, engine: AsyncEngine) -> None:
        async with engine.begin() as conn:
            await conn.execute(text(
                "UPDATE users SET is_verified = 1 "
                "WHERE id IN (SELECT user_id FROM email_verifications WHERE used = 1)"
            ))