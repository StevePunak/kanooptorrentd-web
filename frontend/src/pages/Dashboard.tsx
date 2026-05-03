import { useHealth } from '../hooks/useHealth'
import './Dashboard.css'

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

export default function Dashboard() {
  const { data: health, error, isLoading } = useHealth()

  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <h1 className="dashboard__hero-title">Dashboard</h1>
        <p className="dashboard__hero-tagline">A beginning is the time for taking the most delicate care.</p>
      </div>

      <section className="dashboard__status">
        <h3>Daemon</h3>
        {error && <p className="error">{error.message}</p>}
        {isLoading && <p className="muted">Loading…</p>}
        {health && (
          <dl>
            <dt>Status</dt><dd>{health.status}</dd>
            <dt>Started</dt><dd>{new Date(health.started_at).toLocaleString()}</dd>
            <dt>Uptime</dt><dd>{formatUptime(health.uptime_seconds)}</dd>
          </dl>
        )}
      </section>

      <div className="dashboard__grid">
        <section className="card">
          <h3>Live Statistics</h3>
          <p className="muted">Global up/down rate, peers, DHT nodes — coming with the stats endpoint.</p>
        </section>
        <section className="card">
          <h3>Recent Downloads</h3>
          <p className="muted">Last completed torrents grouped by category — coming with the torrents endpoint.</p>
        </section>
      </div>
    </div>
  )
}
