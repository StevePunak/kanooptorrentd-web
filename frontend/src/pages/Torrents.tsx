import { type TorrentInfo, type TorrentState } from '../api/client'
import {
  usePauseTorrent,
  useRemoveTorrent,
  useResumeTorrent,
  useSessionStats,
  useTorrents,
} from '../hooks/useTorrents'
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

function TorrentRow({ t }: { t: TorrentInfo }) {
  const pause = usePauseTorrent()
  const resume = useResumeTorrent()
  const remove = useRemoveTorrent()

  const isPaused = t.state === 'paused'
  const pct = Math.max(0, Math.min(100, t.progress * 100))

  const onToggle = () => {
    if (isPaused) resume.mutate(t.info_hash)
    else pause.mutate(t.info_hash)
  }

  const onRemove = () => {
    const yes = window.confirm(`Remove "${t.name}"?\n\nClick OK to remove just the torrent, or Cancel to keep it.`)
    if (!yes) return
    const alsoFiles = window.confirm(`Also delete the downloaded files on disk?\n\nOK = delete files, Cancel = keep files.`)
    remove.mutate({ infoHash: t.info_hash, deleteFiles: alsoFiles })
  }

  const busy = pause.isPending || resume.isPending || remove.isPending

  return (
    <tr className={`torrents__row torrents__row--${t.state}`}>
      <td className="torrents__name" title={t.name}>{t.name}</td>
      <td>
        <span className={`torrents__state torrents__state--${t.state}`}>
          {STATE_LABELS[t.state]}
        </span>
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

  const torrents = list?.torrents ?? []

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
          No torrents yet. <a href="/search">Search</a> for something to start a download.
        </p>
      )}

      {torrents.length > 0 && (
        <table className="torrents__table">
          <thead>
            <tr>
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
              <TorrentRow key={t.info_hash} t={t} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
