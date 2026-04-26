# CLAUDE.md

Web companion tool for **KanoopTorrentD** (the headless C++ torrent daemon at `../kanooptorrentd-mains/`). FastAPI proxies the daemon's `/admin/*` REST API and serves the React UI as static assets.

## Stack

- **Backend** (`backend/`): FastAPI + uvicorn + httpx (async client to the daemon).
- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + react-router-dom.
- **Default deployment**: localhost-only, no auth. Daemon at `127.0.0.1:8901`, FastAPI at `127.0.0.1:8000`.

## Architecture

```
React (browser, dev :5173 / prod static via FastAPI)
    │ fetch /api/*
    ▼
FastAPI (uvicorn :8000)
    │ httpx → 127.0.0.1:8901/admin/*
    ▼
KanoopTorrentD (C++ daemon, TorrentControlServer thread)
```

FastAPI is a thin proxy. The daemon owns settings; the FastAPI side never touches the INI directly. Routers under `app/routers/` each call into `app/services/daemon_client.py`.

## Dev workflow

```bash
# Terminal 1 — daemon (from kanooptorrentd-mains)
cmake --build build/Desktop_Qt_6_10_1-Debug
./build/Desktop_Qt_6_10_1-Debug/KanoopTorrentD/kanooptorrentd -v

# Terminal 2 — FastAPI
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 3 — Vite dev server
cd frontend && npm install && npm run dev
# Open http://localhost:5173/
```

## Production build

```bash
cd frontend && npm run build       # populates frontend/dist/
cd ../backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
# Open http://127.0.0.1:8000/  (FastAPI now serves the built bundle)
```

## v1 endpoints

| Method | Path             | Daemon counterpart | Purpose                     |
|--------|------------------|--------------------|-----------------------------|
| GET    | `/api/health`    | `/admin/health`    | status, started_at, uptime  |
| GET    | `/api/version`   | `/admin/version`   | version, git_sha, qt        |
| GET    | `/api/settings`  | `/admin/settings`  | read settings from daemon   |
| PUT    | `/api/settings`  | `/admin/settings`  | partial update; reports requires_restart |

## Out of scope (deferred)

- Torrent endpoints (list/add/remove, session stats).
- Auth, SSL, LAN/WAN exposure.
- Logs streaming and runtime log-level adjustment.
- nginx reverse proxy, single-origin deployment.
