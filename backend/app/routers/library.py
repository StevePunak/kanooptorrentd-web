from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from app.models.schemas import (
    LibraryFilesResponse,
    LibraryRecentAlbumsResponse,
    LibraryRecentShowsResponse,
    LibraryRescanResponse,
    LibraryShowsResponse,
)
from app.services import daemon_client

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/files", response_model=LibraryFilesResponse)
async def get_library_files(
    request: Request,
    category: str = Query("", description="Filter to one of: tv, movie, music, other"),
):
    return await daemon_client.get_library_files(request.app.state.daemon_client, category)


@router.post("/rescan", response_model=LibraryRescanResponse)
async def post_library_rescan(request: Request):
    return await daemon_client.post_library_rescan(request.app.state.daemon_client)


@router.get("/shows", response_model=LibraryShowsResponse)
async def get_library_shows(request: Request):
    return await daemon_client.get_library_shows(request.app.state.daemon_client)


# Order matters: /shows/recent must register before any future placeholder
# /shows/{title} route, otherwise FastAPI resolves "recent" as a path arg.
@router.get("/shows/recent", response_model=LibraryRecentShowsResponse)
async def get_library_recent_shows(
    request: Request,
    days: int = Query(7, ge=1, le=365, description="Recency window in days"),
    limit: int = Query(10, ge=1, le=100, description="Max number of shows to return"),
):
    return await daemon_client.get_library_recent_shows(
        request.app.state.daemon_client, days=days, limit=limit,
    )


@router.get("/albums/recent", response_model=LibraryRecentAlbumsResponse)
async def get_library_recent_albums(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Recency window in days"),
    limit: int = Query(12, ge=1, le=100, description="Max number of albums to return"),
):
    return await daemon_client.get_library_recent_albums(
        request.app.state.daemon_client, days=days, limit=limit,
    )


@router.get("/albums/cover")
async def get_library_album_cover(
    request: Request,
    path: str = Query(..., description="Album rel_path returned by /albums/recent"),
):
    body, content_type, status = await daemon_client.get_library_album_cover(
        request.app.state.daemon_client, rel_path=path,
    )
    if status == 404:
        raise HTTPException(status_code=404, detail="cover not found")
    if status >= 400:
        raise HTTPException(status_code=status, detail="upstream cover error")
    # Modest browser caching — covers don't change once an album is placed,
    # but we don't want to fingerprint the URL since rel_path IS the identity.
    return Response(content=body, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"})
