import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import health, settings, version
from app.services.daemon_client import make_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.daemon_client = make_client()
    try:
        yield
    finally:
        await app.state.daemon_client.aclose()


app = FastAPI(title="KanoopTorrentD Admin API", lifespan=lifespan)

app.include_router(health.router)
app.include_router(version.router)
app.include_router(settings.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
