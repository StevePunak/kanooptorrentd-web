from typing import Optional

from pydantic import BaseModel


class Health(BaseModel):
    status: str
    started_at: str
    uptime_seconds: int


class Version(BaseModel):
    version: str
    git_sha: str
    build_timestamp: str
    qt_version: str


class Settings(BaseModel):
    download_dir: str
    resume_dir: str
    listen_port: int
    control_bind_address: str
    control_listen_port: int


class SettingsUpdate(BaseModel):
    download_dir: Optional[str] = None
    resume_dir: Optional[str] = None
    listen_port: Optional[int] = None
    control_bind_address: Optional[str] = None
    control_listen_port: Optional[int] = None


class SettingsUpdateResult(BaseModel):
    applied: list[str]
    requires_restart: list[str]
    errors: list[str]


class SearchResult(BaseModel):
    name: str
    info_hash: str
    size: int
    size_human: str
    seeders: int
    leechers: int
    added_date: str
    category: str
    uploader_name: str
    magnet: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


class AddTorrentRequest(BaseModel):
    magnet: str


class AddTorrentResponse(BaseModel):
    info_hash: str
    display_name: str
