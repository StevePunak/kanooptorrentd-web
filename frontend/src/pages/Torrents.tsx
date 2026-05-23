import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type TorrentInfo, type TorrentState } from '../api/client'
import {
  useBulkRemoveTorrents,
  usePauseTorrent,
  useRemoveTorrent,
  useResumeTorrent,
  useSessionStats,
  useTorrents,
} from '../hooks/useTorrents'
import { useMovieIdentity } from '../hooks/useMovieIdentity'
import { useMusicIdentity } from '../hooks/useMusicIdentity'
import { MoviePicker } from '../components/MoviePicker'
import { MusicPicker } from '../components/MusicPicker'
import './Torrents.css'

const STATE_LABELS: Record<TorrentState, string> = {
  idle:               'Idle',
  fetching_metadata:  'Fetching metadata',
  checking:           'Checking',
  downloading:        'Downloading',
  seeding:            'Seeding',
  paused:             'Paused',
  error:              'Error',
  unknown:            'Unknown',
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '—'
  return `${formatBytes(bytesPerSec)}/s`
}

function formatEta(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '—'
  if (seconds === 0) return 'done'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function TorrentRow({
  t,
  selected,
  onSelectChange,
  bulkBusy,
  onIdentify,
}: {
  t: TorrentInfo
  selected: boolean
  onSelectChange: (hash: string, checked: boolean) => void
  bulkBusy: boolean
  onIdentify: (t: TorrentInfo) => void
}) {
  const pause = usePauseTorrent()
  const resume = useResumeTorrent()
  const remove = useRemoveTorrent()
  // Only ask the daemon for identity on the relevant category; for
  // everything else the query stays disabled (no network).
  const isMovie = t.category === 'movie'
  const isMusic = t.category === 'music'
  const movieIdentity = useMovieIdentity(t.info_hash, isMovie)
  const musicIdentity = useMusicIdentity(t.info_hash, isMusic)

  const isPaused = t.state === 'paused'
  const pct = Math.max(0, Math.min(100, t.progress * 100))
  // "Needs identity" — paused at 100% on a movie/music torrent with no
  // identity bound. This is the exact state that makes a torrent look
  // mysteriously stuck. Surface it next to the state label so the
  // operator doesn't have to hover the ? button to learn why.
  const needsIdentity =
    isPaused && t.progress >= 1 &&
    ((isMovie && !movieIdentity.data) || (isMusic && !musicIdentity.data))

  const onToggle = () => {
    if (isPaused) resume.mutate(t.info_hash)
    else pause.mutate(t.info_hash)
  }

  const onRemove = () => {
    // Files-on-disk decision is server-side: NAS-rooted save paths preserve
    // files (the curated library), local paths clean up. The user doesn't
    // need to choose — single confirm.
    if (!window.confirm(`Remove "${t.name}"?`)) return
    remove.mutate(t.info_hash)
  }

  const busy = pause.isPending || resume.isPending || remove.isPending || bulkBusy

  return (
    <tr className={`torrents__row torrents__row--${t.state}`}>
      <td className="torrents__select">
        <input
          type="checkbox"
          aria-label={`Select ${t.name}`}
          checked={selected}
          disabled={bulkBusy}
          onChange={e => onSelectChange(t.info_hash, e.target.checked)}
        />
      </td>
      <td className="torrents__name" title={t.name}>{t.name}</td>
      <td>
        <span className={`torrents__state torrents__state--${t.state}`}>
          {STATE_LABELS[t.state]}
        </span>
        {needsIdentity && (
          <span
            className="torrents__needs-id"
            title="Download complete but no identity is bound. The torrent will stay paused until you pick one via the ? button."
          >
            needs ID
          </span>
        )}
      </td>
      <td className="torrents__progress">
        <div className="torrents__progress-inner">
          <div className="torrents__bar"><div className="torrents__bar-fill" style={{ width: `${pct}%` }} /></div>
          <span className="torrents__pct">{pct.toFixed(0)}%</span>
        </div>
      </td>
      <td className="torrents__num">{formatRate(t.download_rate)}</td>
      <td className="torrents__num">{formatRate(t.upload_rate)}</td>
      <td className="torrents__num">{t.connected_peers}</td>
      <td className="torrents__num">{formatEta(t.eta_seconds)}</td>
      <td className="torrents__num">{formatBytes(t.total_size)}</td>
      <td className="torrents__action">
        {isMovie && (movieIdentity.data || t.progress >= 1) && (
          <button
            type="button"
            onClick={() => onIdentify(t)}
            disabled={busy}
            className="torrents__btn"
            title={movieIdentity.data
              ? `TMDB: ${movieIdentity.data.title}${movieIdentity.data.year > 0 ? ` (${movieIdentity.data.year})` : ''} — click to change`
              : 'Movie has no TMDB identity yet — click to pick one. Completion stays paused until set.'}
          >
            {movieIdentity.data ? '✓' : '?'}
          </button>
        )}
        {isMusic && (musicIdentity.data || t.progress >= 1) && (
          <button
            type="button"
            onClick={() => onIdentify(t)}
            disabled={busy}
            className="torrents__btn"
            title={musicIdentity.data
              ? `MB: ${musicIdentity.data.artist || 'Unknown'} — ${musicIdentity.data.album}${musicIdentity.data.year > 0 ? ` (${musicIdentity.data.year})` : ''} — click to change`
              : 'Music has no MusicBrainz identity yet — click to pick one. Completion stays paused until set.'}
          >
            {musicIdentity.data ? '✓' : '?'}
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="torrents__btn"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="torrents__btn torrents__btn--danger"
          title="Remove"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

export default function Torrents() {
  const { data: list, error, isLoading } = useTorrents()
  const { data: stats } = useSessionStats()
  const bulk = useBulkRemoveTorrents()

  const torrents = list?.torrents ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // The movie picker modal lives at the page level (not inside <tbody>) so
  // its fixed-position backdrop doesn't violate HTML table nesting. Rows
  // open it by handing up the torrent they want to identify.
  const [identifyTarget, setIdentifyTarget] = useState<TorrentInfo | null>(null)

  // Drop hashes from the selection that no longer exist (e.g. a single-row
  // delete from another tab) so the count stays accurate.
  const liveSelected = useMemo(() => {
    if (selected.size === 0) return selected
    const live = new Set(torrents.map(t => t.info_hash))
    let changed = false
    const next = new Set<string>()
    for (const h of selected) {
      if (live.has(h)) next.add(h)
      else changed = true
    }
    return changed ? next : selected
  }, [selected, torrents])

  const allSelected = torrents.length > 0 && liveSelected.size === torrents.length
  const someSelected = liveSelected.size > 0

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(torrents.map(t => t.info_hash)))
  }

  const toggleOne = (hash: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(hash)
      else next.delete(hash)
      return next
    })
  }

  const onBulkDelete = () => {
    const hashes = [...liveSelected]
    if (hashes.length === 0) return
    const word = hashes.length === 1 ? 'torrent' : 'torrents'
    if (!window.confirm(`Remove ${hashes.length} ${word}?`)) return
    bulk.mutate(hashes, { onSuccess: () => setSelected(new Set()) })
  }

  return (
    <div className="torrents">
      <h1>Torrents</h1>

      {stats && (
        <section className="torrents__stats">
          <div><dt>Active</dt><dd>{stats.active_torrents}</dd></div>
          <div><dt>Paused</dt><dd>{stats.paused_torrents}</dd></div>
          <div><dt>Down</dt><dd>{formatRate(stats.download_rate)}</dd></div>
          <div><dt>Up</dt><dd>{formatRate(stats.upload_rate)}</dd></div>
          <div><dt>Peers</dt><dd>{stats.total_peers}</dd></div>
          <div><dt>DHT nodes</dt><dd>{stats.dht_nodes}</dd></div>
        </section>
      )}

      {error && <p className="error">{error.message}</p>}

      {isLoading && <p className="muted">Loading…</p>}

      {!isLoading && torrents.length === 0 && (
        <p className="muted">
          No torrents yet. <Link to="/search">Search</Link> for something to start a download.
        </p>
      )}

      {torrents.length > 0 && (
        <>
          {someSelected && (
            <div className="torrents__bulkbar">
              <span>{liveSelected.size} selected</span>
              <button
                type="button"
                className="torrents__btn torrents__btn--danger"
                onClick={onBulkDelete}
                disabled={bulk.isPending}
              >
                {bulk.isPending ? 'Deleting…' : `Delete ${liveSelected.size}`}
              </button>
              <button
                type="button"
                className="torrents__btn"
                onClick={() => setSelected(new Set())}
                disabled={bulk.isPending}
              >
                Clear
              </button>
            </div>
          )}
          <table className="torrents__table">
            <thead>
              <tr>
                <th className="torrents__select-head">
                  <input
                    type="checkbox"
                    aria-label="Select all torrents"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    disabled={bulk.isPending}
                  />
                </th>
                <th>Name</th>
                <th>State</th>
                <th>Progress</th>
                <th className="torrents__num-head">Down</th>
                <th className="torrents__num-head">Up</th>
                <th className="torrents__num-head">Peers</th>
                <th className="torrents__num-head">ETA</th>
                <th className="torrents__num-head">Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {torrents.map((t) => (
                <TorrentRow
                  key={t.info_hash}
                  t={t}
                  selected={liveSelected.has(t.info_hash)}
                  onSelectChange={toggleOne}
                  bulkBusy={bulk.isPending}
                  onIdentify={setIdentifyTarget}
                />
              ))}
            </tbody>
          </table>
        </>
      )}

      {identifyTarget?.category === 'movie' && (
        <MoviePicker
          infoHash={identifyTarget.info_hash}
          fallbackTitle={identifyTarget.name}
          onClose={() => setIdentifyTarget(null)}
        />
      )}
      {identifyTarget?.category === 'music' && (
        <MusicPicker
          infoHash={identifyTarget.info_hash}
          fallbackTitle={identifyTarget.name}
          onClose={() => setIdentifyTarget(null)}
        />
      )}
    </div>
  )
}
