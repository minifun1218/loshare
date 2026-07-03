---
description: 
alwaysApply: true
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Backend** (runs on port 8000):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (runs on port 5173):
```bash
cd frontend
npm install
npm run dev
```

**Frontend lint:**
```bash
cd frontend && npm run lint
```

**Frontend build:**
```bash
cd frontend && npm run build
```

There are no automated tests in this codebase.

## Environment Configuration

The backend reads SMTP and LiveKit settings from `backend/.env`:
```
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your@qq.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your@qq.com

LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Email sending is non-blocking — failures are logged but do not break registration.

## LiveKit / Egress Setup

Audio and video use LiveKit (SFU architecture). Both services must run alongside the backend:

```bash
# LiveKit server
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev

# LiveKit Egress (for recording)
docker run --rm --network host \
  -v /recordings:/recordings \
  -e LIVEKIT_URL=ws://localhost:7880 \
  -e LIVEKIT_API_KEY=devkey \
  -e LIVEKIT_API_SECRET=secret \
  livekit/egress
```

The Egress container writes MP4 files to `/recordings/`; mount a host volume to persist them. Recording is triggered via `POST /api/livekit/egress/start` and stopped via `DELETE /api/livekit/egress/{egress_id}`.

## Architecture

### Backend (`backend/`)

FastAPI async app using SQLite (`loshare.db`, auto-created at startup via `init_db()`). No migration tool — schema changes are applied as inline `ALTER TABLE` in `database.py:init_db()`, ignoring errors if columns already exist.

- `main.py` — app entry, lifespan hook calls `init_db()`, CORS limited to `localhost:5173`
- `database.py` — async SQLAlchemy engine + `AsyncSessionLocal`, `init_db()` for table creation
- `models.py` — ORM models: `User`, `ShareRoom`, `RoomMember`, `Location`, `EmailVerification`, `VerificationCode`
- `schemas.py` — Pydantic v2 request/response schemas
- `auth.py` — JWT helpers (`create_access_token`, `get_current_user` dependency); `SECRET_KEY` is hardcoded (change for production)
- `config.py` — pydantic-settings reading `backend/.env` for SMTP and LiveKit
- `email_service.py` — SMTP email sending (sync wrapped in executor)
- `ws_manager.py` — in-memory `ConnectionManager` singleton tracking `room_id → {user_id → WebSocket}`; process-local, not safe for multi-worker deployments
- `routers/auth.py` — `/api/auth/*`: register, login, verify-email, send-code, resend-verification
- `routers/rooms.py` — `/api/rooms/*`: create, join, list, members/locations, leave
- `routers/location.py` — `/api/location/update` (POST) and `/api/location/ws/{room_id}` (WebSocket)
- `routers/livekit.py` — `/api/livekit/token`, `/api/livekit/egress/*`

### Frontend (`frontend/src/`)

React 19 + Vite 8 + Tailwind CSS v4 + React Router v7.

- `api/client.js` — axios instance (base `http://localhost:8000`), attaches `loshare_token` from localStorage, dispatches `auth:logout` event on 401
- `contexts/AuthContext.jsx` — global auth state; user/token persisted to `loshare_token` / `loshare_user` in localStorage; listens for `auth:logout` event
- `hooks/useWebSocket.js` — WebSocket to `ws://localhost:8000/api/location/ws/{roomId}?token=...`; auto-reconnects with exponential backoff (max 5 retries, up to 16s delay); closes permanently on code 4001 (auth) or 4003 (not a member); dispatches messages via an `onMessage` callback prop
- `hooks/useGeolocation.js` — browser Geolocation API wrapper (high accuracy, watchPosition)
- `components/Map/MapView.jsx` — react-leaflet map rendering member pins; `components/Map/memberIcon.js` produces the custom Leaflet `DivIcon` per member
- `components/MemberList.jsx` — sidebar list of room members; calculates haversine distance client-side; clicking a member calls `onFlyTo` to pan the map; sorts self first, then online members, then by recency
- `components/VideoCall.jsx` — wraps `LiveKitRoom` (from `@livekit/components-react`); contains `CallPanel` (hooks must be inside LiveKitRoom context) and `ParticipantTile`. Egress record/stop buttons call `POST/DELETE /api/livekit/egress/*`.
- `api/livekit.js` — `getLivekitToken(roomId)` returns `{ token, url }` (both fields must be passed to `LiveKitRoom`); `startEgress(roomId)`, `stopEgress(egressId)`
- `pages/RoomPage.jsx` — main room view; posts location every 10 s (`LOCATION_INTERVAL = 10000`); has a `sharingPaused` toggle that stops location updates without leaving the room; fetches a LiveKit JWT on call start, mounts `<VideoCall>` with the token
- `pages/DashboardPage.jsx` — **fat page**: all inline components live here (RoomCard, HeroMap, MapArt, modals CreateRoomModal/JoinRoomModal/InviteModal, Modal wrapper, all SVG icon components). No separate component files for the dashboard UI.

### Key Data Behaviors

- **Location storage**: The `locations` table stores one row per (user, room) pair — each `POST /api/location/update` is an upsert, not a log.
- **Members endpoint**: `GET /api/rooms/{room_id}/members` only returns members who have submitted at least one location; members with no location are omitted.
- **Room codes**: 6-character uppercase alphanumeric, generated with retry for uniqueness. `POST /api/rooms/join/{code}` uppercases the code before lookup.

### WebSocket Message Protocol

The WebSocket at `/api/location/ws/{room_id}` handles **location and presence only** (media is handled by LiveKit).

**Server → client:**
- `location_update` — member moved; payload includes lat/lng/accuracy/updated_at
- `user_online` / `user_offline` — presence events

The WebSocket ignores all incoming client messages.

### LiveKit Integration

- Token endpoint `GET /api/livekit/token?room_id=X` issues a LiveKit JWT for the current user scoped to room `loshare-{room_id}`.
- The frontend connects `LiveKitRoom` with that token. LiveKit handles SFU-based audio/video routing.
- `POST /api/livekit/egress/start` triggers room composite recording (MP4); `DELETE /api/livekit/egress/{id}` stops it.
- Egress proto types may differ across `livekit-api` versions — the router uses a try/import fallback between `livekit.api` and `livekit.protocol.egress`.

### Auth Flow

1. Registration: `POST /api/auth/send-code` (sends 6-digit code to email) → `POST /api/auth/register` with code; successful registration immediately sets `is_verified=True`.
2. Login: `POST /api/auth/login` → JWT token (7-day expiry).
3. Legacy email-link verification: `POST /api/auth/resend-verification` → click link → `GET /api/auth/verify-email?token=...` (kept for backward compatibility; new users are verified at registration).
4. `ProtectedRoute` redirects users with `is_verified=False` to `/verify-email`.

### Route Guards

`App.jsx` defines two guards:
- `ProtectedRoute` — redirects unauthenticated users to `/login`; redirects unverified users to `/verify-email`
- `GuestRoute` — redirects already-authenticated users away from `/login` and `/register` to `/dashboard`

### Room Join Flow

Users can join a room by navigating to `/join/:code` (the `JoinPage`), which calls `POST /api/rooms/join/{code}` after auth. Unauthenticated users are redirected to login and returned to the join URL afterward.

**Deferred join**: `JoinPage` saves the invite code to `sessionStorage('pendingInvite')` before redirecting unauthenticated users to login. After login, `DashboardPage` reads and clears that key on mount and auto-joins the room, then navigates to it.

### Member Data

Members returned by `GET /api/rooms/{room_id}/members` and WebSocket `location_update` messages include an `avatar_color` field — a hex color string pre-computed and stored on the `User` model server-side. Use this field for map pin colors and avatar backgrounds; do not derive colors client-side from user IDs.
