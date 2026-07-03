from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings
from core.errors import register_exception_handlers
from core.logging import configure_logging, get_logger
from core.middleware import (
    AccessLogMiddleware,
    RequestIdMiddleware,
    RequireHttpsForAuthMiddleware,
)
from core.rate_limit import limiter
from database import Base, dispose_engine, engine
from migrations import runner as migrations_runner
from routers import auth as auth_router
from routers import health as health_router
from routers import livekit as livekit_router
from routers import location as location_router
from routers import rooms as rooms_router

logger = get_logger("loshare.main")


def build_allowed_origins() -> list[str]:
    allowed_origins = [settings.frontend_origin]
    if settings.app_env.lower() == "dev":
        allowed_origins.extend(
            [
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        )
    return list(dict.fromkeys(allowed_origins))


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    await migrations_runner.run_migrations(engine)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("application_started", extra={"env": settings.app_env})
    try:
        yield
    finally:
        await dispose_engine()
        logger.info("application_stopped")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LoShare — 实时位置共享与音视频通话后端。",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=build_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AccessLogMiddleware)
app.add_middleware(RequireHttpsForAuthMiddleware)
app.add_middleware(RequestIdMiddleware)

register_exception_handlers(app)

app.include_router(health_router.router)
app.include_router(auth_router.router)
app.include_router(rooms_router.router)
app.include_router(location_router.router)
app.include_router(livekit_router.router)


@app.middleware("http")
async def _security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response