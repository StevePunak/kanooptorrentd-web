from fastapi import APIRouter, Request

from app.models.schemas import Health
from app.services import daemon_client

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("", response_model=Health)
async def get_health(request: Request):
    return await daemon_client.get_health(request.app.state.daemon_client)
