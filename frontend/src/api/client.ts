const API_BASE = '/api'

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

export interface Health {
  status: string
  started_at: string
  uptime_seconds: number
  proxy: ProxySnapshot
}

export interface Version {
  version: string
  git_sha: string
  build_timestamp: string
  qt_version: string
}

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
  addTorrent: (magnet: string) =>
    request<AddTorrentResponse>('/torrents', {
      method: 'POST',
      body: JSON.stringify({ magnet }),
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
