from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from database import engine

router = APIRouter(tags=["meta"])


@router.get("/health")
async def health() -> dict[str, str]:
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "degraded"
    return {"status": "ok", "db": db_status}