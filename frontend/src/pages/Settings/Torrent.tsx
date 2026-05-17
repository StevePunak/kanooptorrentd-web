import { useSettingsForm } from './useSettingsForm'

const KEYS = [
  'listen_port',
  'upload_rate_limit',
  'download_rate_limit',
  'connections_limit',
  'active_downloads',
  'active_seeds',
  'active_limit',
  'dht_enabled',
  'lsd_enabled',
  'utp_enabled',
  'encryption_mode',
] as const

// libtorrent rate limits are bytes/sec; the UI talks KiB/s.
const KIB = 1024
const toKib = (bytes: number) => Math.round(bytes / KIB)
const fromKib = (kib: number) => Math.max(0, Math.round(kib * KIB))

export default function Torrent() {
  const { data, error, saving, restartFields, update, onSubmit } = useSettingsForm([...KEYS])

  if (error && !data) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  return (
    <form onSubmit={onSubmit}>
      <h3>Session</h3>

      <label>Torrent listen port</label>
      <input type="number" value={data.listen_port}
             onChange={e => update('listen_port', parseInt(e.target.value, 10))} />

      <h3 style={{ marginTop: 'var(--space-6)' }}>Limits</h3>
      <p className="muted">Hot-applied — no daemon restart. Set 0 for unlimited.</p>

      <label>Download rate (KiB/s)</label>
      <input type="number" min={0} value={toKib(data.download_rate_limit)}
             onChange={e => update('download_rate_limit', fromKib(parseInt(e.target.value, 10) || 0))} />

      <label>Upload rate (KiB/s)</label>
      <input type="number" min={0} value={toKib(data.upload_rate_limit)}
             onChange={e => update('upload_rate_limit', fromKib(parseInt(e.target.value, 10) || 0))} />

      <label>Max peer connections</label>
      <input type="number" min={0} value={data.connections_limit}
             onChange={e => update('connections_limit', parseInt(e.target.value, 10) || 0)} />
      <p className="muted">0 keeps libtorrent's default (200).</p>

      <h3 style={{ marginTop: 'var(--space-6)' }}>Queue</h3>
      <p className="muted">
        How many torrents libtorrent will run at once. Extras get parked in
        a paused/queued state until earlier ones finish. Set -1 for no cap.
      </p>

      <label>Active downloads</label>
      <input type="number" min={-1} value={data.active_downloads}
             onChange={e => update('active_downloads', parseInt(e.target.value, 10))} />

      <label>Active seeds</label>
      <input type="number" min={-1} value={data.active_seeds}
             onChange={e => update('active_seeds', parseInt(e.target.value, 10))} />

      <label>Total active (downloads + seeds)</label>
      <input type="number" min={-1} value={data.active_limit}
             onChange={e => update('active_limit', parseInt(e.target.value, 10))} />

      <h3 style={{ marginTop: 'var(--space-6)' }}>Protocol</h3>
      <p className="muted">Hot-applied. PEX isn't exposed — libtorrent only toggles it at session construction.</p>

      <label>
        <input type="checkbox" checked={data.dht_enabled}
               onChange={e => update('dht_enabled', e.target.checked)} />
        {' '}DHT (Distributed Hash Table)
      </label>

      <label>
        <input type="checkbox" checked={data.lsd_enabled}
               onChange={e => update('lsd_enabled', e.target.checked)} />
        {' '}LSD (Local Service Discovery)
      </label>

      <label>
        <input type="checkbox" checked={data.utp_enabled}
               onChange={e => update('utp_enabled', e.target.checked)} />
        {' '}µTP (BEP-29 transport)
      </label>

      <label>Peer encryption</label>
      <select value={data.encryption_mode}
              onChange={e => update('encryption_mode', e.target.value)}>
        <option value="enabled">Enabled — prefer encryption, allow plaintext</option>
        <option value="forced">Forced — require encryption</option>
        <option value="disabled">Disabled — plaintext only</option>
      </select>

      {restartFields.length > 0 && (
        <div className="warning">Restart required to apply: {restartFields.join(', ')}</div>
      )}
      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
