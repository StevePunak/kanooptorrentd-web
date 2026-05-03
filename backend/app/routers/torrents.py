from fastapi import APIRouter, Request

from app.models.schemas import (
    AddTorrentRequest,
    AddTorrentResponse,
    TorrentInfo,
    TorrentListResponse,
)
from app.services import daemon_client

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
async def remove_torrent(request: Request, info_hash: str, delete_files: bool = False):
    return await daemon_client.remove_torrent(
        request.app.state.daemon_client, info_hash, delete_files
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
