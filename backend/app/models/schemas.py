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
    last_scan_at: str = ""           # ISO-8601, "" until first scan completes
    file_counts: dict[str, int] = {}  # category → indexed-file count


class LibraryFile(BaseModel):
    base_path: str
    rel_path: str
    category: str = "other"
    size_bytes: int = 0
    mtime: str = ""
    last_seen_at: str = ""


class LibraryFilesResponse(BaseModel):
    files: list[LibraryFile] = []


class LibraryRescanResponse(BaseModel):
    success: bool = True
    message: str = ""


class LibraryShow(BaseModel):
    title: str
    episode_count: int = 0


class LibraryShowsResponse(BaseModel):
    shows: list[LibraryShow] = []


class LibraryRecentShow(BaseModel):
    title: str
    new_episode_count: int = 0
    latest_mtime: str = ""   # ISO-8601 UTC, mtime of most recent file in this group


class LibraryRecentShowsResponse(BaseModel):
    shows: list[LibraryRecentShow] = []


class MonitoredSeries(BaseModel):
    id: int = 0
    title: str = ""
    query: str = ""
    quality_filter: str = ""
    max_size_mb: int = 0   # 0 = no cap; reject candidates larger than this
    skip_older_seasons: bool = False  # reject candidates with season < max season on disk
    enabled: bool = True
    interval_minutes: int = 360
    # TMDB linkage — populated by the picker. 0/"" means the series predates
    # the picker and the watcher falls back to title-only matching.
    tmdb_id: int = 0
    imdb_id: str = ""
    first_air_year: int = 0
    network: str = ""
    poster_path: str = ""
    last_checked_at: str = ""
    last_found_at: str = ""
    created_at: str = ""


class MonitoredSeriesCreate(BaseModel):
    # title and query are required for create; the rest take server-side defaults.
    title: str
    query: str
    quality_filter: str = ""
    max_size_mb: int = 0
    skip_older_seasons: bool = False
    enabled: bool = True
    interval_minutes: int = 360
    # Optional TMDB linkage from the picker — daemon stores them but a missing
    # picker selection (legacy add) is also fine; the watcher falls back to
    # title matching when tmdb_id == 0.
    tmdb_id: int = 0
    imdb_id: str = ""
    first_air_year: int = 0
    network: str = ""
    poster_path: str = ""


class MonitoredSeriesUpdate(BaseModel):
    # All optional — the daemon merges only fields present in the body.
    title: Optional[str] = None
    query: Optional[str] = None
    quality_filter: Optional[str] = None
    max_size_mb: Optional[int] = None
    skip_older_seasons: Optional[bool] = None
    enabled: Optional[bool] = None
    interval_minutes: Optional[int] = None
    tmdb_id: Optional[int] = None
    imdb_id: Optional[str] = None
    first_air_year: Optional[int] = None
    network: Optional[str] = None
    poster_path: Optional[str] = None


class MonitoredSeriesListResponse(BaseModel):
    series: list[MonitoredSeries] = []


class SeriesRunResponse(BaseModel):
    success: bool = True
    message: str = ""


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
    # Bytes/sec for the rate caps; 0 = unlimited (libtorrent convention).
    # connections_limit is session-wide max peer connections; 0 = libtorrent default.
    upload_rate_limit: int = 0
    download_rate_limit: int = 0
    connections_limit: int = 0
    # libtorrent queue caps. -1 disables a cap. Defaults match daemon.
    active_downloads: int = 8
    active_seeds: int = 8
    active_limit: int = 16
    # Protocol toggles. encryption_mode is "enabled" | "forced" | "disabled".
    # PEX is intentionally not exposed — libtorrent doesn't surface it as a
    # runtime settings_pack flag (session-construction extension).
    dht_enabled: bool = True
    lsd_enabled: bool = True
    utp_enabled: bool = True
    encryption_mode: str = "enabled"
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
    # TMDB credentials are write-only; the daemon never echoes them on GET.
    # The UI uses presence-of-field as "(set)" / absence as "(not set)".


class SettingsUpdate(BaseModel):
    download_dir: Optional[str] = None
    resume_dir: Optional[str] = None
    listen_port: Optional[int] = None
    upload_rate_limit: Optional[int] = None
    download_rate_limit: Optional[int] = None
    connections_limit: Optional[int] = None
    active_downloads: Optional[int] = None
    active_seeds: Optional[int] = None
    active_limit: Optional[int] = None
    dht_enabled: Optional[bool] = None
    lsd_enabled: Optional[bool] = None
    utp_enabled: Optional[bool] = None
    encryption_mode: Optional[str] = None
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
    # TMDB integration credentials — write-only; sending null/absent leaves
    # the persisted value unchanged. Sending an empty string clears.
    tmdb_api_key: Optional[str] = None
    tmdb_access_token: Optional[str] = None


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
