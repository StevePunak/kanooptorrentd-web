import httpx
from fastapi import HTTPException

from app.config import DAEMON_BASE_URL, DAEMON_TIMEOUT_SECONDS


def make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=DAEMON_BASE_URL, timeout=DAEMON_TIMEOUT_SECONDS)


async def _request(client: httpx.AsyncClient, method: str, path: str, **kwargs) -> dict:
    try:
        response = await client.request(method, path, **kwargs)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"daemon unreachable: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


async def get_health(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/health")


async def get_version(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/version")


async def get_settings(client: httpx.AsyncClient) -> dict:
    return await _request(client, "GET", "/admin/settings")


async def put_settings(client: httpx.AsyncClient, payload: dict) -> dict:
    return await _request(client, "PUT", "/admin/settings", json=payload)


async def search(client: httpx.AsyncClient, query: str) -> dict:
    return await _request(client, "GET", "/torrents/search", params={"q": query})


async def add_torrent(client: httpx.AsyncClient, magnet: str) -> dict:
    return await _request(client, "POST", "/torrents", json={"magnet": magnet})
