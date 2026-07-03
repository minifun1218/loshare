from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    pass


def _repr(self: object, **fields: object) -> str:
    parts = ", ".join(f"{k}={v!r}" for k, v in fields.items())
    return f"<{type(self).__name__} {parts}>"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_username", "username", unique=True),
        Index("ix_users_email", "email", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    locations: Mapped[list[Location]] = relationship(
        "Location", back_populates="user", lazy="selectin", cascade="all, delete-orphan"
    )
    rooms: Mapped[list[RoomMember]] = relationship(
        "RoomMember", back_populates="user", lazy="selectin", cascade="all, delete-orphan"
    )
    owned_rooms: Mapped[list[ShareRoom]] = relationship(
        "ShareRoom", back_populates="owner", lazy="selectin"
    )

    def __repr__(self) -> str:
        return _repr(self, id=self.id, username=self.username, email=self.email)


class EmailVerification(Base):
    __tablename__ = "email_verifications"
    __table_args__ = (Index("ix_email_ver_token", "token", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:
        return _repr(self, id=self.id, user_id=self.user_id, used=self.used)


class VerificationCode(Base):
    __tablename__ = "verification_codes"
    __table_args__ = (Index("ix_ver_codes_email", "email"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:
        return _repr(self, id=self.id, email=self.email, code=self.code)


class ShareRoom(Base):
    __tablename__ = "share_rooms"
    __table_args__ = (Index("ix_share_rooms_code", "code", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    members: Mapped[list[RoomMember]] = relationship(
        "RoomMember", back_populates="room", lazy="selectin", cascade="all, delete-orphan"
    )
    owner: Mapped[User] = relationship(
        "User", back_populates="owned_rooms", lazy="joined"
    )

    def __repr__(self) -> str:
        return _repr(self, id=self.id, code=self.code, name=self.name)


class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_room_member_room_user"),
        Index("ix_room_members_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("share_rooms.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    room: Mapped[ShareRoom] = relationship("ShareRoom", back_populates="members")
    user: Mapped[User] = relationship("User", back_populates="rooms")

    def __repr__(self) -> str:
        return _repr(self, room_id=self.room_id, user_id=self.user_id)


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("user_id", "room_id", name="uq_locations_user_room"),
        Index("ix_locations_room", "room_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    room_id: Mapped[int] = mapped_column(
        ForeignKey("share_rooms.id", ondelete="CASCADE"), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="locations")

    def __repr__(self) -> str:
        return _repr(
            self,
            id=self.id,
            user_id=self.user_id,
            room_id=self.room_id,
            lat=self.latitude,
            lon=self.longitude,
        )