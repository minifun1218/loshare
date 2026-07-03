# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server on port 5173
npm run build     # production build
npm run lint      # ESLint check
npm run preview   # preview production build
```

There are no tests.

## Architecture

React 19 + Vite 8 + Tailwind CSS v4 + React Router v7. The backend runs on `http://localhost:8000`; both the axios client (`src/api/client.js`) and the WebSocket hook (`src/hooks/useWebSocket.js`) hardcode `localhost:8000`.

**Page/route layout:**
- `/login`, `/register` → `AuthPage` (mode prop), wrapped in `GuestRoute`
- `/verify-email` → `VerifyEmailPage`
- `/join/:code` → `JoinPage` (handles deferred join via `sessionStorage('pendingInvite')`)
- `/dashboard` → `DashboardPage`, wrapped in `ProtectedRoute`
- `/room/:roomId` → `RoomPage`, wrapped in `ProtectedRoute`

**API layer** (`src/api/`): thin wrappers around the axios instance. Each file exports named functions that return the `.data` field directly. The client attaches `Authorization: Bearer <token>` from `localStorage('loshare_token')` and dispatches `auth:logout` DOM event on 401.

**Auth state**: `AuthContext` reads stored user/token from localStorage on mount, then immediately calls `GET /api/auth/me` to refresh. The `loading` flag is `true` until that fetch resolves. Both `ProtectedRoute` and `GuestRoute` gate on `loading` to avoid redirect flicker.

**Real-time flow**: `useWebSocket` in `RoomPage` receives `location_update`, `user_online`, `user_offline` messages and merges them into component state. Location is also POSTed every 10 s (`LOCATION_INTERVAL`) via `updateLocation`. The WebSocket ignores all outgoing sends (the `send` return value is unused).

**VideoCall architecture**: `VideoCall` renders `<LiveKitRoom>` which provides context. `CallPanel` is a child component that calls LiveKit hooks (`useLocalParticipant`, `useRemoteParticipants`, `useTracks`) — these hooks require being inside `<LiveKitRoom>`. LiveKit participant `identity` is `String(user_id)`.

**Map rendering**: `MapView` uses `react-leaflet`. Map pins are Leaflet `DivIcon`s built in `memberIcon.js` from raw HTML strings. The `MapController` child component uses `useMap()` to imperatively call `flyTo` when `flyTarget` or the self-position changes.

## Key Conventions

**Styling**: Tailwind v4 with CSS custom properties defined in `@theme {}` block in `src/index.css`. Reference design tokens as `var(--color-primary)` etc. in inline styles, or use the equivalent Tailwind class (e.g. `text-[var(--color-text-2)]`). Component styles use a BEM-like prefix per scope: `rp-` for RoomPage, `ml-` for MemberList, `call-` for VideoCall, `map-` for map components.

**SVG icons**: All shared icons live in `src/components/icons.jsx` as named exports with an optional `size` prop (default matches original usage). Import only what you need. Two pin variants exist: `PinIcon` (outlined stroke, for map pins) and `PinFilledIcon` (solid fill, for brand marks in auth/nav). `CloseIcon` also accepts `strokeWidth`.

**Component structure**: Components extracted from the original fat pages/files:
- `src/components/modals/` — `CreateRoomModal`, `JoinRoomModal`, `InviteModal` (each imports `Modal` and the relevant API call)
- `src/components/Modal.jsx` — base modal shell (Escape key + overlay click to close)
- `src/components/RoomCard.jsx` + `EmptyState.jsx` — from `FriendsMapSection`
- `src/components/CallMenu.jsx` — call type picker (click-outside handled internally)
- `src/components/ParticipantTile.jsx` + `CallPanel.jsx` — from `VideoCall`; `ControlBtn` stays local inside `CallPanel`
- `src/utils/memberColor.js` — `MEMBER_PALETTE` and `memberColor(seed)`, shared by `DashboardPage`, `FriendsMapSection`, and `InviteModal`
- `src/hooks/useCopy.js` — clipboard copy with timed key reset

**`avatar_color`**: Always comes from the server (`User.avatar_color` field, a hex string). Never derive or generate colors client-side from user IDs. Use it directly for map pin backgrounds, avatar circles, and `ParticipantTile` avatar fallbacks.

**Theme**: Three themes (`fresh`, `night`, `sakura`) stored in `localStorage('loshare_theme')`. Switching is handled in `DashboardPage` via `DashboardNav`'s `onThemeChange` prop.

**Room state in navigation**: When navigating to `/room/:roomId`, pass `state: { room }` so `RoomPage` can show the room name and code without an extra API fetch. `room` may be `undefined` if the user navigates directly; `RoomPage` falls back to `朋友地图 ${roomId}`.

**No emoji** — per global project rule, do not use emoji in any frontend output or UI copy.
