import { useEffect, useState } from 'react'
import { api, type Health as HealthType } from '../api/client'

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

export default function Health() {
  const [data, setData] = useState<HealthType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      api.health()
        .then(d => { if (!cancelled) { setData(d); setError(null) } })
        .catch(e => { if (!cancelled) setError(e.message) })
    }
    load()
    const id = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (error) return <div><h1>Health</h1><p className="error">{error}</p></div>
  if (!data) return <div><h1>Health</h1><p>Loading…</p></div>

  return (
    <div>
      <h1>Health</h1>
      <dl>
        <dt>Status</dt><dd>{data.status}</dd>
        <dt>Started</dt><dd>{new Date(data.started_at).toLocaleString()}</dd>
        <dt>Uptime</dt><dd>{formatUptime(data.uptime_seconds)}</dd>
      </dl>
    </div>
  )
}
