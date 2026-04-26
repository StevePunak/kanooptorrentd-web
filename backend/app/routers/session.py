from fastapi import APIRouter, Request

from app.models.schemas import SessionStats
from app.services import daemon_client

router = APIRouter(prefix="/api/session", tags=["session"])


@router.get("/stats", response_model=SessionStats)
async def get_session_stats(request: Request):
    return await daemon_client.session_stats(request.app.state.daemon_client)
