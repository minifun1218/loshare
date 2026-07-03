from __future__ import annotations

import asyncio
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from functools import partial
from typing import Any

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings
from core.logging import get_logger

logger = get_logger("loshare.email")

_CODE_ALPHABET = string.digits
_CODE_LEN = 6


def generate_code() -> str:
    return "".join(random.choices(_CODE_ALPHABET, k=_CODE_LEN))


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def make_msg(*, to: str, subject: str, html: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"LoShare <{settings.smtp_from}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _send_sync(*, to: str, subject: str, html: str) -> None:
    if not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP 凭据未配置")

    msg = make_msg(to=to, subject=subject, html=html)

    if settings.smtp_port == 465:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            context=ctx,
            timeout=settings.smtp_timeout,
        ) as srv:
            srv.ehlo()
            srv.login(settings.smtp_user, settings.smtp_password)
            srv.sendmail(settings.smtp_from, to, msg.as_string())
    else:
        with smtplib.SMTP(
            settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout
        ) as srv:
            srv.ehlo()
            srv.starttls(context=ssl.create_default_context())
            srv.ehlo()
            srv.login(settings.smtp_user, settings.smtp_password)
            srv.sendmail(settings.smtp_from, to, msg.as_string())


async def send_email(*, to: str, subject: str, html: str) -> bool:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None, partial(_send_sync, to=to, subject=subject, html=html)
        )
        return True
    except Exception as exc:
        logger.warning(
            "email_send_failed",
            extra={"to": to, "subject": subject, "error": str(exc)},
        )
        return False


_VERIFY_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>验证您的邮箱</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3d5ce6,#6b8aff);padding:36px 40px;text-align:center;">
            <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">LoShare</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f1117;">验证您的邮箱地址</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              您好，<strong>{username}</strong>！请于 <strong>30 分钟</strong>内点击下方按钮完成验证。
            </p>
            <p style="margin:0;text-align:center;padding:8px 0 28px;">
              <a href="{verify_url}" style="display:inline-block;background:#4f6ef7;color:white;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;">验证邮箱</a>
            </p>
            <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;">
              {verify_url}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _code_html(code: str) -> str:
    digits = "".join(
        f'<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;'
        f'font-size:28px;font-weight:800;color:#0f1117;background:#f4f6fb;'
        f'border:1.5px solid #e2e6ef;border-radius:10px;margin:0 4px;">{d}</span>'
        for d in code
    )
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"/><title>注册验证码 — LoShare</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3d5ce6,#6b8aff);padding:32px 40px;text-align:center;">
            <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">LoShare</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1117;">注册验证码</h1>
            <p style="margin:0 0 32px;font-size:14px;color:#6b7280;">请在注册页面输入以下 6 位验证码，10 分钟内有效。</p>
            <div style="margin:0 auto 32px;">{digits}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def build_verification_email(*, username: str, token: str) -> tuple[str, str]:
    verify_url = f"{settings.frontend_origin}/verify-email?token={token}"
    html = _VERIFY_HTML.format(username=username, verify_url=verify_url)
    return ("验证您的邮箱 — LoShare", html)


def build_code_email(code: str) -> tuple[str, str]:
    return (f"您的注册验证码：{code} — LoShare", _code_html(code))


async def send_verification_email(*, to: str, username: str, token: str) -> bool:
    subject, html = build_verification_email(username=username, token=token)
    return await send_email(to=to, subject=subject, html=html)


async def send_code_email(*, to: str, code: str) -> bool:
    subject, html = build_code_email(code)
    return await send_email(to=to, subject=subject, html=html)


def code_expires_at(minutes: int = 10) -> datetime:
    return utcnow() + timedelta(minutes=minutes)


def token_expires_at(minutes: int = 30) -> datetime:
    return utcnow() + timedelta(minutes=minutes)


__all__: list[Any] = [
    "generate_code",
    "generate_token",
    "utcnow",
    "send_verification_email",
    "send_code_email",
    "code_expires_at",
    "token_expires_at",
]