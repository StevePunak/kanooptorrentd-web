import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import health, search, settings, torrents, version
from app.services.daemon_client import make_client


class SpaStaticFiles(StaticFiles):
    """StaticFiles that serves index.html for any unknown path.

    React Router uses pushState; without this, a direct visit or reload of
    /settings hits the server, finds no file, and returns 404. Falling back
    to index.html lets the client-side router resolve the path.
    """

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


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
app.include_router(search.router)
app.include_router(torrents.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", SpaStaticFiles(directory=frontend_dist, html=True), name="frontend")
