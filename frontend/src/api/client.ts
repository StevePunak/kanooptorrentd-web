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
  last_scan_at: string  // ISO-8601, "" until first scan completes
  file_counts: Record<string, number>  // category → count
}

export interface LibraryFile {
  base_path: string
  rel_path: string
  category: string
  size_bytes: number
  mtime: string
  last_seen_at: string
}

export interface LibraryFilesResponse {
  files: LibraryFile[]
}

export interface LibraryShow {
  title: string
  episode_count: number
}

export interface LibraryShowsResponse {
  shows: LibraryShow[]
}

export interface LibraryRecentShow {
  title: string
  new_episode_count: number
  latest_mtime: string  // ISO-8601 UTC, "" if scanner hasn't recorded mtime yet
}

export interface LibraryRecentShowsResponse {
  shows: LibraryRecentShow[]
}

export interface MonitoredSeries {
  id: number
  title: string
  query: string
  quality_filter: string  // comma-separated tokens; empty = no filter
  max_size_mb: number     // 0 = no cap
  skip_older_seasons: boolean  // reject candidates with season < max on-disk season
  enabled: boolean
  interval_minutes: number
  last_checked_at: string  // ISO-8601, "" = never run
  last_found_at: string    // ISO-8601, "" = never matched
  created_at: string
  // TMDB linkage — 0/"" when the series was added without picker metadata.
  tmdb_id: number
  imdb_id: string
  first_air_year: number   // 4-digit; 0 = unknown
  network: string          // display name (e.g. "Apple TV+", "HBO")
  poster_path: string      // TMDB relative path (e.g. "/abc.jpg"); "" = no art
}

export interface MonitoredSeriesCreate {
  title: string
  query: string
  quality_filter?: string
  max_size_mb?: number
  skip_older_seasons?: boolean
  enabled?: boolean
  interval_minutes?: number
  // Optional TMDB linkage from the picker.
  tmdb_id?: number
  imdb_id?: string
  first_air_year?: number
  network?: string
  poster_path?: string
}

// ─── TMDB metadata proxy (daemon → FastAPI → us) ────────────────────────────
//
// The FastAPI side mounts the daemon's /admin/tmdb/* under /api/metadata/* —
// just a name change at the layer boundary, not a behavioural one. Responses
// are TMDB's own JSON shapes (we don't re-key on the backend).

export interface MetadataSearchResult {
  id: number
  name: string
  original_name: string
  first_air_date: string   // YYYY-MM-DD or ""; empty when TMDB hasn't dated it
  overview: string
  poster_path: string | null
  origin_country: string[]
}

export interface MetadataSearchResponse {
  page: number
  results: MetadataSearchResult[]
  total_pages: number
  total_results: number
}

export interface MetadataShowExternalIds {
  imdb_id: string | null
  tvdb_id: number | null
  // TMDB returns several others (facebook_id, twitter_id, etc.) but only
  // imdb_id matters for the watcher; the rest are ignored.
}

export interface MetadataNetwork {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
}

export interface MetadataShowDetails {
  id: number
  name: string
  original_name: string
  first_air_date: string
  overview: string
  poster_path: string | null
  networks: MetadataNetwork[]
  external_ids: MetadataShowExternalIds
}

export interface MetadataMovieSearchResult {
  id: number
  title: string
  original_title: string
  release_date: string     // YYYY-MM-DD or ""
  overview: string
  poster_path: string | null
}

export interface MetadataMovieSearchResponse {
  page: number
  results: MetadataMovieSearchResult[]
  total_pages: number
  total_results: number
}

export interface MetadataMovieDetails {
  id: number
  title: string
  original_title: string
  release_date: string
  overview: string
  poster_path: string | null
  runtime: number | null
  external_ids: MetadataShowExternalIds
}

/** Per-torrent TMDB movie identity. Returned by GET, accepted (tmdb_id only)
 *  by PUT on /api/torrents/{hash}/movie-identity. */
export interface MovieIdentity {
  tmdb_id: number
  imdb_id: string
  title: string
  year: number             // 0 when TMDB had no release_date
  poster_path: string
}

// ─── MusicBrainz album search + identity (daemon → FastAPI → us) ────────────

export interface MetadataAlbumSearchResult {
  id: string                          // MBID (UUID)
  title: string                       // release-group title
  'first-release-date'?: string       // "YYYY" or "YYYY-MM-DD" or absent
  'primary-type'?: string             // "Album" / "EP" / "Single" / etc.
  'artist-credit'?: Array<{
    name: string
    joinphrase?: string
    artist?: { id: string; name: string }
  }>
}

export interface MetadataAlbumSearchResponse {
  count: number
  offset: number
  'release-groups': MetadataAlbumSearchResult[]
}

export interface MetadataAlbumDetails extends MetadataAlbumSearchResult {
  releases?: Array<{ id: string; title: string; date?: string }>
}

/** Per-torrent MusicBrainz identity. mbid blank = synthetic (no MB match;
 *  the auto-bind path fell back to the parsed release name). */
export interface MusicIdentity {
  mbid: string
  artist: string
  album: string
  year: number             // 0 when MB had no first-release-date
  cover_url: string
}

/** Picker seed from the daemon's /admin/mb/guess. When `source` is "tags"
 *  the daemon scanned embedded ID3/Vorbis tags on disk; "name" means it
 *  fell back to parsing the torrent name (files not present yet). */
export interface MusicAlbumGuess {
  source: 'tags' | 'name'
  confidence: 'high' | 'medium' | 'low' | 'none'
  artist: string
  album: string
  year: number
  mbid: string
}

export interface MonitoredSeriesListResponse {
  series: MonitoredSeries[]
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
  // Bytes/sec for the rate caps; 0 = unlimited.
  // connections_limit is session-wide max peer connections; 0 = libtorrent default.
  upload_rate_limit: number
  download_rate_limit: number
  connections_limit: number
  // libtorrent queue caps; -1 = no cap
  active_downloads: number
  active_seeds: number
  active_limit: number
  // Protocol toggles. encryption_mode: "enabled" | "forced" | "disabled".
  // PEX is intentionally not exposed — libtorrent doesn't expose it as a
  // runtime settings_pack flag.
  dht_enabled: boolean
  lsd_enabled: boolean
  utp_enabled: boolean
  encryption_mode: string
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
  // TMDB integration credentials — write-only over the wire, never echoed on
  // GET. Send empty string on PUT to clear; omit to leave unchanged.
  tmdb_api_key: string
  tmdb_access_token: string
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
  removeTorrent: (infoHash: string) =>
    request<OperationResult>(`/torrents/${infoHash}`, { method: 'DELETE' }),
  pauseTorrent: (infoHash: string) =>
    request<OperationResult>(`/torrents/${infoHash}/pause`, { method: 'POST' }),
  resumeTorrent: (infoHash: string) =>
    request<OperationResult>(`/torrents/${infoHash}/resume`, { method: 'POST' }),
  sessionStats: () => request<SessionStatsResponse>('/session/stats'),
  libraryFiles: (category?: LibraryCategory) => {
    const path = category ? `/library/files?category=${category}` : '/library/files'
    return request<LibraryFilesResponse>(path)
  },
  rescanLibrary: () =>
    request<OperationResult>('/library/rescan', { method: 'POST' }),
  libraryShows: () => request<LibraryShowsResponse>('/library/shows'),
  libraryRecentShows: (days = 7, limit = 10) =>
    request<LibraryRecentShowsResponse>(
      `/library/shows/recent?days=${days}&limit=${limit}`,
    ),
  listSeries: () => request<MonitoredSeriesListResponse>('/series'),
  createSeries: (payload: MonitoredSeriesCreate) =>
    request<MonitoredSeries>('/series', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSeries: (id: number, payload: Partial<MonitoredSeriesCreate>) =>
    request<MonitoredSeries>(`/series/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteSeries: (id: number) =>
    request<OperationResult>(`/series/${id}`, { method: 'DELETE' }),
  runSeries: (id: number) =>
    request<OperationResult>(`/series/${id}/run`, { method: 'POST' }),
  // TMDB search + show-detail proxied through FastAPI (which proxies
  // through the daemon's /admin/tmdb/*). Returns TMDB's native JSON shape.
  metadataSearch: (q: string) =>
    request<MetadataSearchResponse>(
      `/metadata/search?q=${encodeURIComponent(q)}`,
    ),
  metadataShow: (tvId: number) =>
    request<MetadataShowDetails>(`/metadata/show/${tvId}`),
  metadataMovieSearch: (q: string) =>
    request<MetadataMovieSearchResponse>(
      `/metadata/search/movie?q=${encodeURIComponent(q)}`,
    ),
  metadataMovie: (movieId: number) =>
    request<MetadataMovieDetails>(`/metadata/movie/${movieId}`),
  getMovieIdentity: (infoHash: string) =>
    request<MovieIdentity>(`/torrents/${infoHash}/movie-identity`),
  setMovieIdentity: (infoHash: string, tmdbId: number) =>
    request<MovieIdentity>(`/torrents/${infoHash}/movie-identity`, {
      method: 'PUT',
      body: JSON.stringify({ tmdb_id: tmdbId }),
    }),
  metadataAlbumSearch: (artist: string, album: string, year: number) => {
    const p = new URLSearchParams({ album })
    if (artist) p.set('artist', artist)
    if (year > 0) p.set('year', String(year))
    return request<MetadataAlbumSearchResponse>(`/metadata/search/album?${p}`)
  },
  metadataAlbum: (mbid: string) =>
    request<MetadataAlbumDetails>(`/metadata/album/${mbid}`),
  metadataAlbumGuess: (infoHash: string) =>
    request<MusicAlbumGuess>(`/metadata/album/guess/${infoHash}`),
  getMusicIdentity: (infoHash: string) =>
    request<MusicIdentity>(`/torrents/${infoHash}/music-identity`),
  setMusicIdentity: (infoHash: string, mbid: string) =>
    request<MusicIdentity>(`/torrents/${infoHash}/music-identity`, {
      method: 'PUT',
      body: JSON.stringify({ mbid }),
    }),
}
