from fastapi import APIRouter, Request

from app.models.schemas import (
    MonitoredSeries,
    MonitoredSeriesCreate,
    MonitoredSeriesListResponse,
    MonitoredSeriesUpdate,
    SeriesRunResponse,
)
from app.services import daemon_client

router = APIRouter(prefix="/api/series", tags=["series"])


@router.get("", response_model=MonitoredSeriesListResponse)
async def list_series(request: Request):
    return await daemon_client.list_series(request.app.state.daemon_client)


@router.post("", response_model=MonitoredSeries)
async def create_series(payload: MonitoredSeriesCreate, request: Request):
    return await daemon_client.create_series(
        request.app.state.daemon_client, payload.model_dump()
    )


@router.get("/{series_id}", response_model=MonitoredSeries)
async def get_series(series_id: int, request: Request):
    return await daemon_client.get_series(request.app.state.daemon_client, series_id)


@router.put("/{series_id}", response_model=MonitoredSeries)
async def update_series(series_id: int, payload: MonitoredSeriesUpdate, request: Request):
    # exclude_unset so only fields the user actually sent become a partial update.
    return await daemon_client.update_series(
        request.app.state.daemon_client, series_id, payload.model_dump(exclude_unset=True)
    )


@router.delete("/{series_id}", response_model=SeriesRunResponse)
async def delete_series(series_id: int, request: Request):
    return await daemon_client.delete_series(request.app.state.daemon_client, series_id)


@router.post("/{series_id}/run", response_model=SeriesRunResponse)
async def run_series(series_id: int, request: Request):
    return await daemon_client.run_series(request.app.state.daemon_client, series_id)
