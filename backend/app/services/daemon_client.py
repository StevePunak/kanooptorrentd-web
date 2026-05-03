import logging

import httpx
from fastapi import HTTPException

from app.config import DAEMON_BASE_URL, DAEMON_TIMEOUT_SECONDS

log = logging.getLogger(__name__)


def make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=DAEMON_BASE_URL, timeout=DAEMON_TIMEOUT_SECONDS)


async def _request(client: httpx.AsyncClient, method: str, path: str, **kwargs) -> dict:
    try:
        response = await client.request(method, path, **kwargs)
    except httpx.RequestError as exc:
        log.warning("daemon unreachable on %s %s: %s", method, path, exc)
        raise HTTPException(status_code=503, detail=f"daemon unreachable: {exc}") from exc

    if response.status_code >= 400:
        # Daemon error bodies follow the Kanoop OperationResult shape:
        # {"success": false, "message": "..."}. Older callers used {"error": "..."}.
        # Prefer the structured message; fall back to raw text for opaque errors.
        detail = response.text
        try:
            body = response.json()
            if isinstance(body, dict):
                detail = body.get("message") or body.get("error") or detail
        except ValueError:
            pass
        log.info("daemon %d on %s %s: %s", response.status_code, method, path, detail)
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


async def get_health(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/health")


async def get_version(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/version")


async def get_settings(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/settings")


async def put_settings(client: httpx.AsyncClient, payload: dict) -> dict:
    return await _request(client, "PUT", "/admin/settings", json=payload)


async def search(client: httpx.AsyncClient, query: str, category: str | None = None) -> dict:
    params: dict[str, str] = {"q": query}
    if category:
        params["cat"] = category
    return await _request(client, "GET", "/torrents/search", params=params)


async def add_torrent(client: httpx.AsyncClient, magnet: str, category: str = "") -> dict:
    body: dict[str, str] = {"magnet": magnet}
    if category:
        body["category"] = category
    return await _request(client, "POST", "/torrents", json=body)


async def list_torrents(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/torrents")


async def get_torrent(client: httpx.AsyncClient, info_hash: str) -> dict:
    return await _request(client, "GET", f"/torrents/{info_hash}")


async def remove_torrent(client: httpx.AsyncClient, info_hash: str, delete_files: bool) -> dict:
    return await _request(
        client, "DELETE", f"/torrents/{info_hash}",
        params={"delete_files": "true" if delete_files else "false"},
    )


async def pause_torrent(client: httpx.AsyncClient, info_hash: str) -> dict:
    return await _request(client, "POST", f"/torrents/{info_hash}/pause")


async def resume_torrent(client: httpx.AsyncClient, info_hash: str) -> dict:
    return await _request(client, "POST", f"/torrents/{info_hash}/resume")


async def session_stats(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/session/stats")


async def get_logs(client: httpx.AsyncClient, lines: int) -> dict:
    return await _request(client, "GET", "/admin/logs", params={"lines": str(lines)})


async def get_log_level(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/log-level")


async def set_log_level(client: httpx.AsyncClient, level: str) -> dict:
    return await _request(client, "PUT", "/admin/log-level", json={"level": level})
