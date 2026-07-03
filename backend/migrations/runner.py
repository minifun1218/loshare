from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from core.logging import get_logger

logger = get_logger("loshare.migrations")


@dataclass(frozen=True, slots=True)
class MigrationRecord:
    version: str
    name: str

    @property
    def full_id(self) -> str:
        return f"{version}_{name}"


class Migration(ABC):
    version: str
    name: str

    @abstractmethod
    async def up(self, engine: AsyncEngine) -> None: ...

    @property
    def record(self) -> MigrationRecord:
        return MigrationRecord(version=self.version, name=self.name)


MIGRATIONS: list[Migration] = []


def register(migration: Migration) -> Migration:
    MIGRATIONS.append(migration)
    return migration


_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS _migrations (
    version TEXT NOT NULL,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (version, name)
)
"""


async def _ensure_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text(_TABLE_DDL))


async def _applied_versions(engine: AsyncEngine) -> set[str]:
    async with engine.connect() as conn:
        rows = (await conn.execute(text("SELECT version, name FROM _migrations"))).all()
    return {f"{v}_{n}" for v, n in rows}


async def run_migrations(engine: AsyncEngine) -> None:
    await _ensure_table(engine)
    applied = await _applied_versions(engine)

    migrations: Iterable[Migration] = sorted(
        MIGRATIONS, key=lambda m: (m.version, m.name)
    )
    for migration in migrations:
        record = migration.record
        if record.full_id in applied:
            continue
        logger.info(
            "applying_migration",
            extra={"version": record.version, "name": record.name},
        )
        async with engine.begin() as conn:
            try:
                await migration.up(engine)
                await conn.execute(
                    text(
                        "INSERT INTO _migrations (version, name) VALUES (:v, :n)"
                    ),
                    {"v": record.version, "n": record.name},
                )
            except Exception:
                logger.exception(
                    "migration_failed",
                    extra={"version": record.version, "name": record.name},
                )
                raise