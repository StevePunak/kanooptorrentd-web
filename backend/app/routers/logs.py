from fastapi import APIRouter, Request

from app.models.schemas import LogLevelResponse, LogLevelUpdate, LogsResponse
from app.services import daemon_client

router = APIRouter(tags=["logs"])


@router.get("/api/logs", response_model=LogsResponse)
async def get_logs(request: Request, lines: int = 200):
    return await daemon_client.get_logs(request.app.state.daemon_client, lines)


@router.get("/api/log-level", response_model=LogLevelResponse)
async def get_log_level(request: Request):
    return await daemon_client.get_log_level(request.app.state.daemon_client)


@router.put("/api/log-level", response_model=LogLevelResponse)
async def set_log_level(request: Request, payload: LogLevelUpdate):
    return await daemon_client.set_log_level(request.app.state.daemon_client, payload.level)
