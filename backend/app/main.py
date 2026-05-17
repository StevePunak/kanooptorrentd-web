import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.logging_config import configure_logging
from app.routers import health, library, logs, metadata, search, series, session, settings, torrents, version
from app.services.daemon_client import make_client

configure_logging()
log = logging.getLogger(__name__)


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
    log.info("FastAPI startup; daemon client targeting %s", app.state.daemon_client.base_url)
    try:
        yield
    finally:
        log.info("FastAPI shutdown")
        await app.state.daemon_client.aclose()


# root_path lets FastAPI know it's mounted behind a prefix-stripping reverse
# proxy (gateway-admin's nginx serves us at /apps/kanooptorrentd/* and strips
# that prefix before forwarding). Set WEB_ROOT_PATH=/apps/kanooptorrentd in
# the stilgar service's environment so Swagger UI's openapi_url, redirects,
# and any other absolute-URL generators emit prefixed paths the browser can
# actually reach through nginx. In dev (no env), root_path="" — direct uvicorn
# at localhost:8080 keeps working as-is.
app = FastAPI(
    title="KanoopTorrentD Admin API",
    lifespan=lifespan,
    root_path=os.environ.get("WEB_ROOT_PATH", ""),
)

app.include_router(health.router)
app.include_router(version.router)
app.include_router(settings.router)
app.include_router(search.router)
app.include_router(torrents.router)
app.include_router(session.router)
app.include_router(logs.router)
app.include_router(library.router)
app.include_router(series.router)
app.include_router(metadata.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", SpaStaticFiles(directory=frontend_dist, html=True), name="frontend")
