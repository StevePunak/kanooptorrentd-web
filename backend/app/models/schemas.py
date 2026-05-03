from typing import Literal, Optional

from pydantic import BaseModel


class ProxySnapshot(BaseModel):
    mode: str = "direct"
    state: str = "disabled"
    exit_ip: str = ""
    last_error: str = ""


class LibraryPathRow(BaseModel):
    path: str
    category: str = "other"
    state: str = "ready"   # "ready" | "missing" | "not_writable"
    error: str = ""


class LibrarySnapshot(BaseModel):
    strict: bool = False
    state: str = "ready"   # "ready" | "failed"
    paths: list[LibraryPathRow] = []


class Health(BaseModel):
    status: str
    started_at: str
    uptime_seconds: int
    proxy: Optional[ProxySnapshot] = None
    library: Optional[LibrarySnapshot] = None


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
    # Proxy fields land here once the daemon exposes them; defaults keep the
    # schema tolerant of older daemons that predate the gate.
    proxy_mode: str = "direct"
    proxy_host: str = ""
    proxy_port: int = 1080
    proxy_username: str = ""
    proxy_verify_url: str = "https://api.ipify.org"
    # proxy_password is intentionally write-only — the daemon never echoes it.
    # NAS library save paths: torrents added with a category are routed here.
    tv_shows_path: str = "/mnt/nas/TV Shows"
    movies_path: str = "/mnt/nas/Movies"
    music_path: str = "/mnt/nas/Curated Music"
    # When true, daemon won't bring up libtorrent unless every library path
    # is mounted + writable. Default false; UI exposes this as a checkbox.
    library_strict: bool = False


class SettingsUpdate(BaseModel):
    download_dir: Optional[str] = None
    resume_dir: Optional[str] = None
    listen_port: Optional[int] = None
    control_bind_address: Optional[str] = None
    control_listen_port: Optional[int] = None
    proxy_mode: Optional[str] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    proxy_verify_url: Optional[str] = None
    tv_shows_path: Optional[str] = None
    movies_path: Optional[str] = None
    music_path: Optional[str] = None
    library_strict: Optional[bool] = None


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
    # "tv" | "movie" | "music" | "other" — drives daemon save-path lookup.
    # Empty/omitted falls back to OtherLibraryCategory → download_dir.
    category: Optional[str] = None


class AddTorrentResponse(BaseModel):
    info_hash: str
    display_name: str


TorrentState = Literal[
    "idle",
    "fetching_metadata",
    "checking",
    "downloading",
    "seeding",
    "paused",
    "error",
    "unknown",
]


class TorrentInfo(BaseModel):
    info_hash: str
    name: str
    state: TorrentState
    progress: float
    bytes_downloaded: int
    total_size: int
    download_rate: int
    upload_rate: int
    connected_peers: int
    total_uploaded: int
    ratio: float
    eta_seconds: int
    has_metadata: bool
    download_directory: str
    # Library category derived from the save path on the daemon side.
    category: str = "other"


class TorrentListResponse(BaseModel):
    torrents: list[TorrentInfo]


class SessionStats(BaseModel):
    total_downloaded: int
    total_uploaded: int
    download_rate: int
    upload_rate: int
    total_peers: int
    dht_nodes: int
    active_torrents: int
    paused_torrents: int


class LogsResponse(BaseModel):
    lines: list[str]
    level: str
    filename: str


class LogLevelResponse(BaseModel):
    level: str


class LogLevelUpdate(BaseModel):
    level: str
