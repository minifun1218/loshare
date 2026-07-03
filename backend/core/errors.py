from __future__ import annotations

from enum import StrEnum
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jose import JWTError
from pydantic import BaseModel, ConfigDict
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.websockets import WebSocket, WebSocketState

from core.logging import get_logger, request_id_var

logger = get_logger("loshare.errors")


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    INTERNAL = "INTERNAL"
    BAD_REQUEST = "BAD_REQUEST"


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorCode
    message: str
    request_id: str
    details: dict[str, Any] | None = None


_STATUS_TO_CODE: dict[int, ErrorCode] = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHENTICATED,
    403: ErrorCode.PERMISSION_DENIED,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    422: ErrorCode.VALIDATION_ERROR,
    429: ErrorCode.RATE_LIMITED,
    503: ErrorCode.SERVICE_UNAVAILABLE,
}


def _envelope(
    code: ErrorCode,
    message: str,
    *,
    details: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    return ErrorEnvelope(
        error=code,
        message=message,
        details=details,
        request_id=request_id or request_id_var.get(),
    ).model_dump(exclude_none=True)


class APIError(Exception):
    """服务层可抛出的业务异常。FastAPI 处理器会将其转换为统一错误响应。"""

    code: ErrorCode = ErrorCode.INTERNAL
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class BadRequestError(APIError):
    code = ErrorCode.BAD_REQUEST
    status_code = status.HTTP_400_BAD_REQUEST


class UnauthorizedError(APIError):
    code = ErrorCode.UNAUTHENTICATED
    status_code = status.HTTP_401_UNAUTHORIZED


class PermissionDeniedError(APIError):
    code = ErrorCode.PERMISSION_DENIED
    status_code = status.HTTP_403_FORBIDDEN


class NotFoundError(APIError):
    code = ErrorCode.NOT_FOUND
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(APIError):
    code = ErrorCode.CONFLICT
    status_code = status.HTTP_409_CONFLICT


class ServiceUnavailableError(APIError):
    code = ErrorCode.SERVICE_UNAVAILABLE
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


def _clean_pydantic_message(msg: str) -> str:
    """去掉 Pydantic 拼接的 'Value error, ' / 'Assertion error, ' 前缀。"""
    for prefix in ("Value error, ", "Assertion error, "):
        if msg.startswith(prefix):
            return msg[len(prefix):]
    return msg


def _format_validation_errors(
    errors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """将 Pydantic 校验错误压平成 {field, message, type} 列表，去掉多余字段。"""
    formatted: list[dict[str, Any]] = []
    for err in errors:
        loc = err.get("loc", ())
        field_parts = [str(part) for part in loc if part != "body"]
        formatted.append(
            {
                "field": ".".join(field_parts) if field_parts else None,
                "message": _clean_pydantic_message(err.get("msg", "参数无效")),
                "type": err.get("type", "value_error"),
            }
        )
    return formatted


def _first_validation_message(errors: list[dict[str, Any]]) -> str:
    if not errors:
        return "请求参数校验失败"
    first = errors[0]
    field = first.get("field")
    msg = first.get("message", "参数无效")
    return f"{field}: {msg}" if field else msg


async def _http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code = _STATUS_TO_CODE.get(exc.status_code, ErrorCode.BAD_REQUEST)
    headers = exc.headers if isinstance(exc, HTTPException) else None
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(
            code,
            str(exc.detail) if exc.detail else code.value,
        ),
        headers=headers,
    )


async def _validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    formatted = _format_validation_errors(exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_envelope(
            ErrorCode.VALIDATION_ERROR,
            _first_validation_message(formatted),
            details={"errors": formatted},
        ),
    )


async def _jwt_exception_handler(
    request: Request, exc: JWTError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content=_envelope(ErrorCode.UNAUTHENTICATED, "认证失败，请重新登录"),
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(
            exc.code,
            exc.message,
            details=exc.details,
        ),
    )


async def _rate_limit_exception_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    logger.info(
        "rate_limited",
        extra={
            "path": request.url.path,
            "method": request.method,
            "limit": str(exc.detail),
        },
    )
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=_envelope(
            ErrorCode.RATE_LIMITED,
            "请求过于频繁，请稍后再试",
            details={"limit": str(exc.detail)},
        ),
    )
    if getattr(request.state, "view_rate_limit", None) is not None:
        response = request.app.state.limiter._inject_headers(
            response, request.state.view_rate_limit
        )
    return response


async def _sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    logger.exception(
        "database_error",
        extra={"path": request.url.path, "error": str(exc)},
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=_envelope(
            ErrorCode.SERVICE_UNAVAILABLE,
            "数据服务暂不可用，请稍后重试",
        ),
    )


async def _unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        extra={"path": request.url.path, "error_type": type(exc).__name__},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_envelope(ErrorCode.INTERNAL, "服务器内部错误"),
    )


async def ws_send_error_and_close(
    websocket: WebSocket,
    *,
    code: ErrorCode,
    message: str,
    close_code: int,
    details: dict[str, Any] | None = None,
) -> None:
    """在 WebSocket 上发送统一错误信封并以指定 close code 关闭连接。"""
    if websocket.client_state == WebSocketState.CONNECTING:
        try:
            await websocket.accept()
        except Exception:
            return
    if websocket.client_state == WebSocketState.CONNECTED:
        try:
            await websocket.send_json(
                _envelope(code, message, details=details)
            )
        except Exception as exc:
            logger.warning(
                "ws_error_send_failed",
                extra={"close_code": close_code, "error": str(exc)},
            )
    try:
        await websocket.close(code=close_code)
    except Exception:
        pass


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(JWTError, _jwt_exception_handler)
    app.add_exception_handler(APIError, _api_error_handler)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exception_handler)
    app.add_exception_handler(SQLAlchemyError, _sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
