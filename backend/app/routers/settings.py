from fastapi import APIRouter, Request

from app.models.schemas import Settings, SettingsUpdate, SettingsUpdateResult
from app.services import daemon_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=Settings)
async def get_settings(request: Request):
    return await daemon_client.get_settings(request.app.state.daemon_client)


@router.put("", response_model=SettingsUpdateResult)
async def update_settings(request: Request, payload: SettingsUpdate):
    return await daemon_client.put_settings(
        request.app.state.daemon_client,
        payload.model_dump(exclude_none=True),
    )
