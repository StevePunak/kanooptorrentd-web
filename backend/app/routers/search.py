from typing import Optional

from fastapi import APIRouter, Request

from app.models.schemas import SearchResponse
from app.services import daemon_client

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(request: Request, q: str, cat: Optional[str] = None):
    return await daemon_client.search(request.app.state.daemon_client, q, cat)
