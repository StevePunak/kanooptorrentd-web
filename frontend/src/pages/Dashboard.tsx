import { useState } from 'react'
import { useHealth } from '../hooks/useHealth'
import { useLibraryRecentAlbums, useLibraryRecentShows } from '../hooks/useLibrary'
import { useVersion } from '../hooks/useVersion'
import ProxyStateBadge from '../components/common/ProxyStateBadge'
import RecentEpisodesModal from '../components/RecentEpisodesModal'
import type { LibraryRecentAlbum, LibraryRecentShow } from '../api/client'
import './Dashboard.css'

const RECENT_DAYS = 30
const RECENT_LIMIT = 12
const RECENT_ALBUMS_LIMIT = 12

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!t) return iso
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// Heuristic: a "show" title that contains a release-name fingerprint is almost
// certainly a stray release-folder rather than an organized show directory. We
// flag it visually so the user can spot it without reading carefully.
const RELEASE_NAME_PATTERN = /\b(?:S\d{1,2}E\d{1,2}|1080p|720p|2160p|4K|x264|x265|HEVC|AV1|WEB[-.\s]?DL|BluRay|HDTV)\b/i

function looksLikeRelease(title: string): boolean {
  return RELEASE_NAME_PATTERN.test(title)
}

function RecentShowCard({
  show,
  onClick,
}: {
  show: LibraryRecentShow
  onClick: () => void
}) {
  const stray = looksLikeRelease(show.title)
  return (
    <div
      className={`recent-show${stray ? ' recent-show--stray' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      title={stray ? 'Looks like a release-name folder — may be unorganized' : undefined}
    >
      <div className="recent-show__title">{show.title}</div>
      <div className="recent-show__meta">
        <span className="recent-show__count">
          {show.new_episode_count} new
        </span>
        {show.latest_mtime && (
          <span className="recent-show__last">{formatRelative(show.latest_mtime)}</span>
        )}
      </div>
    </div>
  )
}

function RecentAlbumCard({ album }: { album: LibraryRecentAlbum }) {
  return (
    <div className="recent-album">
      <div className="recent-album__title">
        <div className="recent-album__artist">{album.artist}</div>
        <div className="recent-album__album">
          {album.album}
          {album.year > 0 && <span className="recent-album__year"> ({album.year})</span>}
        </div>
      </div>
      <div className="recent-album__meta">
        <span className="recent-album__count">{album.track_count} tracks</span>
        {album.latest_mtime && (
          <span className="recent-album__last">{formatRelative(album.latest_mtime)}</span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: health, error, isLoading } = useHealth()
  const { data: version } = useVersion()
  const recent = useLibraryRecentShows(RECENT_DAYS, RECENT_LIMIT)
  const recentAlbums = useLibraryRecentAlbums(RECENT_DAYS, RECENT_ALBUMS_LIMIT)
  const [activeShow, setActiveShow] = useState<string | null>(null)

  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <h1 className="dashboard__hero-title">Dashboard</h1>
        <p className="dashboard__hero-tagline">A beginning is the time for taking the most delicate care.</p>
      </div>

      <section className="dashboard__status">
        <div className="dashboard__status-header">
          <h3>Daemon</h3>
          <ProxyStateBadge />
        </div>
        {error && <p className="error">{error.message}</p>}
        {isLoading && <p className="muted">Loading…</p>}
        {health && (
          <dl>
            <dt>Status</dt><dd>{health.status}</dd>
            <dt>Started</dt><dd>{new Date(health.started_at).toLocaleString()}</dd>
            <dt>Uptime</dt><dd>{formatUptime(health.uptime_seconds)}</dd>
            {version && (
              <>
                <dt>Version</dt>
                <dd>{version.version} <span className="muted">({version.git_sha})</span></dd>
              </>
            )}
          </dl>
        )}
      </section>

      <section className="card recent-shows">
        <header className="recent-shows__header">
          <h3>Recent Shows</h3>
          <span className="muted recent-shows__window">
            last {RECENT_DAYS} days
          </span>
        </header>
        {recent.error && <p className="error">{recent.error.message}</p>}
        {recent.isLoading && <p className="muted">Loading…</p>}
        {recent.data && recent.data.shows.length === 0 && (
          <p className="muted">
            No new TV episodes have landed in the last {RECENT_DAYS} days.
          </p>
        )}
        {recent.data && recent.data.shows.length > 0 && (
          <div className="recent-shows__grid">
            {recent.data.shows.map(s => (
              <RecentShowCard
                key={s.title}
                show={s}
                onClick={() => setActiveShow(s.title)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card recent-albums">
        <header className="recent-albums__header">
          <h3>Recent Albums</h3>
          <span className="muted recent-albums__window">
            last {RECENT_DAYS} days
          </span>
        </header>
        {recentAlbums.error && <p className="error">{recentAlbums.error.message}</p>}
        {recentAlbums.isLoading && <p className="muted">Loading…</p>}
        {recentAlbums.data && recentAlbums.data.albums.length === 0 && (
          <p className="muted">
            No new albums have landed in the last {RECENT_DAYS} days.
          </p>
        )}
        {recentAlbums.data && recentAlbums.data.albums.length > 0 && (
          <div className="recent-albums__grid">
            {recentAlbums.data.albums.map(a => (
              <RecentAlbumCard key={a.rel_path} album={a} />
            ))}
          </div>
        )}
      </section>

      {activeShow && (
        <RecentEpisodesModal
          showTitle={activeShow}
          days={RECENT_DAYS}
          onClose={() => setActiveShow(null)}
        />
      )}
    </div>
  )
}
