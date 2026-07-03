from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from auth import CurrentUser
from database import DbSession
from schemas.auth import (
    ResendVerificationRequest,
    SendCodeRequest,
    Token,
    UserLogin,
    UserOut,
    UserRegister,
    VerifyEmailResponse,
)
from services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _service(db: AsyncSession) -> AuthService:
    return AuthService(db)


@router.post("/send-code", response_model=VerifyEmailResponse)
async def send_code(
    body: SendCodeRequest,
    background: BackgroundTasks,
    db: DbSession,
) -> VerifyEmailResponse:
    await _service(db).issue_verification_code(email=body.email, background=background)
    return VerifyEmailResponse(message="验证码已发送，请检查收件箱")


@router.post("/register", response_model=Token, status_code=201)
async def register(body: UserRegister, db: DbSession) -> Token:
    return await _service(db).register(
        username=body.username,
        email=body.email,
        password=body.password,
        code=body.code,
    )


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: DbSession) -> Token:
    return await _service(db).login(username=body.username, password=body.password)


@router.get("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(token: str, db: DbSession) -> VerifyEmailResponse:
    await _service(db).verify_email_token(token)
    return VerifyEmailResponse(message="邮箱验证成功")


@router.post("/resend-verification", response_model=VerifyEmailResponse)
async def resend_verification(
    body: ResendVerificationRequest,
    background: BackgroundTasks,
    db: DbSession,
) -> VerifyEmailResponse:
    await _service(db).resend_verification_email(email=body.email, background=background)
    return VerifyEmailResponse(message="如果该邮箱已注册且未验证，验证邮件已发送")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)