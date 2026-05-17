from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.models.schemas import (
    AddTorrentRequest,
    AddTorrentResponse,
    TorrentInfo,
    TorrentListResponse,
)
from app.services import daemon_client


class MovieIdentityUpdate(BaseModel):
    tmdb_id: int

router = APIRouter(prefix="/api/torrents", tags=["torrents"])


@router.get("", response_model=TorrentListResponse)
async def list_torrents(request: Request):
    return await daemon_client.list_torrents(request.app.state.daemon_client)


@router.post("", response_model=AddTorrentResponse)
async def add_torrent(request: Request, payload: AddTorrentRequest):
    return await daemon_client.add_torrent(
        request.app.state.daemon_client, payload.magnet, payload.category or ""
    )


@router.get("/{info_hash}", response_model=TorrentInfo)
async def get_torrent(request: Request, info_hash: str):
    return await daemon_client.get_torrent(
        request.app.state.daemon_client, info_hash
    )


@router.delete("/{info_hash}")
async def remove_torrent(request: Request, info_hash: str):
    # Whether files-on-disk go with the torrent is server-side policy in
    # the daemon (NAS preserves, local cleans). Don't pass delete_files.
    return await daemon_client.remove_torrent(
        request.app.state.daemon_client, info_hash
    )


@router.post("/{info_hash}/pause")
async def pause_torrent(request: Request, info_hash: str):
    return await daemon_client.pause_torrent(
        request.app.state.daemon_client, info_hash
    )


@router.post("/{info_hash}/resume")
async def resume_torrent(request: Request, info_hash: str):
    return await daemon_client.resume_torrent(
        request.app.state.daemon_client, info_hash
    )


@router.get("/{info_hash}/movie-identity")
async def get_movie_identity(request: Request, info_hash: str):
    """Stored TMDB identity for a movie torrent. 404 (with the daemon's
    OperationResult message) when none has been chosen yet."""
    return await daemon_client.get_movie_identity(
        request.app.state.daemon_client, info_hash
    )


@router.put("/{info_hash}/movie-identity")
async def set_movie_identity(
    request: Request, info_hash: str, payload: MovieIdentityUpdate,
):
    """Bind a TMDB movie id to the torrent. Daemon resolves title/year/
    imdb/poster from TMDB (cached) — the UI only sends tmdb_id."""
    return await daemon_client.set_movie_identity(
        request.app.state.daemon_client, info_hash, payload.tmdb_id,
    )
