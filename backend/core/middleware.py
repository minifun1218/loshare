from __future__ import annotations

import time
import uuid
from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings
from core.errors import ErrorCode, _envelope
from core.logging import get_logger, request_id_var

logger = get_logger("loshare.access")

REQUEST_ID_HEADER = "X-Request-ID"
_AUTH_PATHS_REQUIRING_HTTPS = frozenset(
    {
        "/api/auth/send-code",
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/resend-verification",
    }
)
_LOCAL_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})


def new_request_id() -> str:
    return uuid.uuid4().hex


def _request_uses_https(request: Request) -> bool:
    if request.url.scheme == "https":
        return True
    if not settings.trusted_proxy_headers:
        return False
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_scheme = request.headers.get("x-forwarded-scheme", "")
    return "https" in {part.strip().lower() for part in forwarded_proto.split(",")} or (
        forwarded_scheme.lower() == "https"
    )


def _is_local_request(request: Request) -> bool:
    host = request.url.hostname or ""
    client_host = request.client.host if request.client else ""
    return host in _LOCAL_HOSTS or client_host in _LOCAL_HOSTS


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        rid = request.headers.get(REQUEST_ID_HEADER) or new_request_id()
        token = request_id_var.set(rid)
        request.state.request_id = rid
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers[REQUEST_ID_HEADER] = rid
        return response


class RequireHttpsForAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if (
            settings.enforce_https
            and request.url.path in _AUTH_PATHS_REQUIRING_HTTPS
            and not _request_uses_https(request)
            and not _is_local_request(request)
        ):
            logger.warning(
                "insecure_auth_request_blocked",
                extra={"method": request.method, "path": request.url.path},
            )
            return Response(
                content=_json_auth_https_required(),
                status_code=426,
                media_type="application/json",
                headers={"Upgrade": "TLS/1.2, HTTP/1.1"},
            )
        return await call_next(request)


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start = time.perf_counter()
        response: Response | None = None
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            client = request.client.host if request.client else "-"
            logger.info(
                "http_access",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": status_code,
                    "duration_ms": round(elapsed_ms, 2),
                    "client": client,
                },
            )
            if response is not None and response.status_code >= 500:
                logger.error(
                    "http_error",
                    extra={
                        "method": request.method,
                        "path": request.url.path,
                        "status": status_code,
                    },
                )


def _json_auth_https_required() -> str:
    import json

    return json.dumps(
        _envelope(
            ErrorCode.PERMISSION_DENIED,
            "登录、注册等认证请求必须通过 HTTPS 发送",
            details={"required_scheme": "https"},
        ),
        ensure_ascii=False,
    )
