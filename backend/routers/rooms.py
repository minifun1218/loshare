from __future__ import annotations

from fastapi import APIRouter

from auth import CurrentUser
from database import DbSession
from schemas.rooms import MemberLocation, RoomCreate, RoomOut
from services.rooms import RoomsService

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=201)
async def create_room(body: RoomCreate, db: DbSession, current_user: CurrentUser) -> RoomOut:
    return await RoomsService(db).create(body=body, owner=current_user)


@router.post("/join/{code}", response_model=RoomOut)
async def join_room(code: str, db: DbSession, current_user: CurrentUser) -> RoomOut:
    return await RoomsService(db).join(code=code, user=current_user)


@router.get("", response_model=list[RoomOut])
async def list_my_rooms(db: DbSession, current_user: CurrentUser) -> list[RoomOut]:
    return await RoomsService(db).list_for_user(user=current_user)


@router.get("/{room_id}/members", response_model=list[MemberLocation])
async def get_room_members_locations(
    room_id: int, db: DbSession, current_user: CurrentUser
) -> list[MemberLocation]:
    return await RoomsService(db).list_member_locations(
        room_id=room_id, user=current_user
    )


@router.delete("/{room_id}/leave")
async def leave_room(room_id: int, db: DbSession, current_user: CurrentUser) -> dict[str, str]:
    await RoomsService(db).leave(room_id=room_id, user=current_user)
    return {"message": "已退出房间"}