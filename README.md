# kanooptorrentd-web

Web admin UI for [KanoopTorrentD](https://github.com/StevePunak/KanoopTorrentD), the headless Qt6 BitTorrent daemon. FastAPI backend proxies the daemon's REST API and serves a React frontend as static assets.

## Quick start

Three processes — daemon, FastAPI, Vite dev server.

```bash
# 1. Daemon (from kanooptorrentd-mains workspace)
cmake --build build/Desktop_Qt_6_10_1-Debug
./build/Desktop_Qt_6_10_1-Debug/KanoopTorrentD/kanooptorrentd -v

# 2. Backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload

# 3. Frontend
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173/.

For a production-style run, `npm run build` and let FastAPI serve the bundle at http://127.0.0.1:8000/.

## Layout

```
kanooptorrentd-web/
├── backend/                # FastAPI proxy
│   ├── app/
│   │   ├── main.py         # FastAPI app + lifespan + static mount
│   │   ├── config.py       # daemon URL
│   │   ├── routers/        # /api/health, /api/version, /api/settings
│   │   ├── services/       # httpx client to the daemon
│   │   └── models/         # Pydantic schemas
│   └── requirements.txt
├── frontend/               # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── pages/          # Health, Version, Settings
│   │   └── api/client.ts
│   └── package.json
└── deploy/
    └── kanooptorrentd-web.service   # systemd unit
```
