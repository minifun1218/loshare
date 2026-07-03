# AGENTS.md

Compact agent guidance for the `loshare` workspace. Full architecture and API reference live in `CLAUDE.md` (root) and `frontend/CLAUDE.md` — read them when you need depth.

## Workspace layout

- `backend/` — FastAPI + SQLite, port 8000.
- `frontend/` — React 19 + Vite 8 + Tailwind v4, port 5173.
- `start.ps1` — Windows convenience launcher that spawns both dev servers in separate PowerShell windows.
- `test.py` (repo root) is **not** part of this project; it is an unrelated DeepSeek API streaming test. Do not modify or run it as part of LoShare work.

## Run / verify commands

There are no automated tests, and the frontend has no `typecheck` script (`npm run lint` is the only static check). The verification loop is dev-server + manual smoke plus frontend lint.

```bash
# Both servers (Windows)
./start.ps1

# Backend only (from backend/)
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend only (from frontend/)
npm install
npm run dev               # vite dev server on 5173
npm run lint              # ESLint flat config (eslint.config.js)
npm run build             # production build -> frontend/dist/
```

API docs: http://localhost:8000/docs

## Required infrastructure for full functionality

- **LiveKit server** (Docker) — required for audio/video. Default `ws://localhost:7880`. Token endpoint scopes rooms to `loshare-{room_id}`.
- **LiveKit Egress** (Docker) — required only for call recording. Mount `/recordings` to persist MP4 output.
- **SMTP** — set in `backend/.env`. Email failures are non-blocking; registration still succeeds.

## Backend quirks

- SQLite DB `backend/loshare.db` is auto-created at startup via `init_db()`. Schema changes are applied as inline `ALTER TABLE` ignoring "already exists" errors — no migration tool.
- `SECRET_KEY` is hardcoded in `backend/auth.py`. Must be changed before any non-local deploy.
- CORS is locked to `http://localhost:5173`. Update `main.py` if the frontend origin changes.
- `ws_manager.ConnectionManager` is process-local and in-memory. Not safe across multiple uvicorn workers.
- Location storage is an **upsert per (user, room)** — `POST /api/location/update` overwrites, not appends. `GET /api/rooms/{id}/members` only returns members who have posted at least one location.
- WebSocket `/api/location/ws/{room_id}` carries location + presence only. Media flows over LiveKit; do not put audio/video frames through this socket.
- `config.py` reads `LIVEKIT_URL` but defaults to `ws://...`; the backend LiveKit HTTP API needs `http(s)://`. Set both in `.env` if your dev server uses TLS or a non-default host.
- Room codes are 6-char uppercase alphanumeric, generated with retry for uniqueness. Join endpoint uppercases input.

## Frontend quirks

- Auth state lives in `localStorage` under keys `loshare_token` and `loshare_user`. The axios client (`api/client.js`) dispatches a global `auth:logout` event on 401 — `AuthContext` listens and clears state.
- `useWebSocket.js` reconnects with exponential backoff (max 5 retries, up to 16 s). It closes permanently on close codes 4001 (auth) or 4003 (not a member); do not auto-reconnect on these.
- `RoomPage.jsx` posts location every `LOCATION_INTERVAL = 10000` ms while in a room.
- `VideoCall.jsx` wraps `LiveKitRoom`. Hooks used inside its `CallPanel` rely on the LiveKit room context, so they must remain children of `<LiveKitRoom>`.
- Vite default port 5173 is hardcoded in four places: backend CORS (`main.py`), the axios base URL (`api/client.js`), the WebSocket URL (`hooks/useWebSocket.js`), and the email verification link (`backend/email_service.py:133`). Change all four together if you move it.

## Style / workflow conventions

- Frontend design direction is **modern minimalist** (project-wide): restrained typography, generous whitespace, subtle borders, single accent color, no decorative HUD/scanline/telemetry noise. Auth page is the reference; keep other pages consistent.
- Frontend design rule (project-wide, from `CLAUDE.md` parent): **no emoji in UI**. Applies to all `frontend/src/**` JSX/CSS.
- Do not add code comments unless asked.
- The repo has no pre-commit hooks, no CI, and no test runner configured. Don't invent them; ask before adding.