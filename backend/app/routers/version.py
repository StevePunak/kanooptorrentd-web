from fastapi import APIRouter, Request

from app.models.schemas import Version
from app.services import daemon_client

router = APIRouter(prefix="/api/version", tags=["version"])


@router.get("", response_model=Version)
async def get_version(request: Request):
    return await daemon_client.get_version(request.app.state.daemon_client)
