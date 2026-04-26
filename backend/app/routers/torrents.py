from fastapi import APIRouter, Request

from app.models.schemas import AddTorrentRequest, AddTorrentResponse
from app.services import daemon_client

router = APIRouter(prefix="/api/torrents", tags=["torrents"])


@router.post("", response_model=AddTorrentResponse)
async def add_torrent(request: Request, payload: AddTorrentRequest):
    return await daemon_client.add_torrent(
        request.app.state.daemon_client, payload.magnet
    )
