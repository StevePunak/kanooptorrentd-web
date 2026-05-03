// BASE_URL is Vite's `base` config — '/apps/kanooptorrentd/' on the appliance,
// '/' in dev. Trailing-slash + 'api' gives a URL the browser hits at the right
// origin-relative path for both modes without hardcoding the install prefix here.
const API_BASE = `${import.meta.env.BASE_URL}api`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json()
}

export interface ProxySnapshot {
  mode: string         // "direct" | "socks5_strict"
  state: string        // "disabled" | "verifying" | "verified" | "failed"
  exit_ip: string      // populated when verified
  last_error: string   // populated when failed
}

export interface LibraryPathRow {
  path: string
  category: string      // "tv" | "movie" | "music" | "other"
  state: string         // "ready" | "missing" | "not_writable"
  error: string
}

export interface LibrarySnapshot {
  strict: boolean
  state: string         // "ready" | "failed"
  paths: LibraryPathRow[]
}

export interface Health {
  status: string
  started_at: string
  uptime_seconds: number
  proxy: ProxySnapshot
  library?: LibrarySnapshot
}

export interface Version {
  version: string
  git_sha: string
  build_timestamp: string
  qt_version: string
}

export type LibraryCategory = 'tv' | 'movie' | 'music' | 'other'

export interface Settings {
  download_dir: string
  resume_dir: string
  listen_port: number
  control_bind_address: string
  control_listen_port: number
  proxy_mode: string         // "direct" | "socks5_strict"
  proxy_host: string
  proxy_port: number
  proxy_username: string
  proxy_password: string     // write-only — empty on GET
  proxy_verify_url: string
  // NAS library save paths — torrents added with a category route here.
  tv_shows_path: string
  movies_path: string
  music_path: string
  // When true, daemon refuses to bring up libtorrent unless every library
  // path passes its mount check. Default off so unmounted defaults don't brick.
  library_strict: boolean
}

export interface SettingsUpdateResult {
  applied: string[]
  requires_restart: string[]
  errors: string[]
}

export interface SearchResultRow {
  name: string
  info_hash: string
  size: number
  size_human: string
  seeders: number
  leechers: number
  added_date: string
  category: string
  uploader_name: string
  magnet: string
}

export interface SearchResponse {
  query: string
  results: SearchResultRow[]
}

export interface AddTorrentResponse {
  info_hash: string
  display_name: string
}

export type TorrentState =
  | 'idle'
  | 'fetching_metadata'
  | 'checking'
  | 'downloading'
  | 'seeding'
  | 'paused'
  | 'error'
  | 'unknown'

export interface TorrentInfo {
  info_hash: string
  name: string
  state: TorrentState
  progress: number
  bytes_downloaded: number
  total_size: number
  download_rate: number
  upload_rate: number
  connected_peers: number
  total_uploaded: number
  ratio: number
  eta_seconds: number
  has_metadata: boolean
  download_directory: string
  category: LibraryCategory  // "other" when uncategorized
}

export interface TorrentListResponse {
  torrents: TorrentInfo[]
}

export interface SessionStatsResponse {
  total_downloaded: number
  total_uploaded: number
  download_rate: number
  upload_rate: number
  total_peers: number
  dht_nodes: number
  active_torrents: number
  paused_torrents: number
}

export interface OperationResult {
  success: boolean
  message: string
}

export const api = {
  health: () => request<Health>('/health'),
  version: () => request<Version>('/version'),
  getSettings: () => request<Settings>('/settings'),
  putSettings: (payload: Partial<Settings>) =>
    request<SettingsUpdateResult>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  search: (query: string, category?: string) => {
    const params = new URLSearchParams({ q: query })
    if (category && category !== 'any') params.set('cat', category)
    return request<SearchResponse>(`/search?${params}`)
  },
  addTorrent: (magnet: string, category?: LibraryCategory) =>
    request<AddTorrentResponse>('/torrents', {
      method: 'POST',
      body: JSON.stringify(category ? { magnet, category } : { magnet }),
    }),
  listTorrents: () => request<TorrentListResponse>('/torrents'),
  getTorrent: (infoHash: string) =>
    request<TorrentInfo>(`/torrents/${infoHash}`),
  removeTorrent: (infoHash: string, deleteFiles: boolean) =>
    request<OperationResult>(
      `/torrents/${infoHash}?delete_files=${deleteFiles}`,
      { method: 'DELETE' },
    ),
  pauseTorrent: (infoHash: string) =>
    request<OperationResult>(`/torrents/${infoHash}/pause`, { method: 'POST' }),
  resumeTorrent: (infoHash: string) =>
    request<OperationResult>(`/torrents/${infoHash}/resume`, { method: 'POST' }),
  sessionStats: () => request<SessionStatsResponse>('/session/stats'),
}
