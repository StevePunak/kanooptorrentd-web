import logging

from fastapi import APIRouter, Request

from app.models.schemas import Settings, SettingsUpdate, SettingsUpdateResult
from app.services import daemon_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=Settings)
async def get_settings(request: Request):
    return await daemon_client.get_settings(request.app.state.daemon_client)


@router.put("", response_model=SettingsUpdateResult)
async def update_settings(request: Request, payload: SettingsUpdate):
    payload_dict = payload.model_dump(exclude_none=True)
    # Don't log the password if present.
    safe = {k: ("***" if k == "proxy_password" else v) for k, v in payload_dict.items()}
    log.info("settings update: %s", safe)
    return await daemon_client.put_settings(request.app.state.daemon_client, payload_dict)
