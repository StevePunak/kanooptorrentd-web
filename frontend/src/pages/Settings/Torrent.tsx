import { useSettingsForm } from './useSettingsForm'

const KEYS = ['listen_port'] as const

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

      <p className="muted" style={{ marginTop: 'var(--space-4)' }}>
        Rate limits, DHT/PEX/LSD, encryption — coming as the daemon exposes them.
      </p>

      {restartFields.length > 0 && (
        <div className="warning">Restart required to apply: {restartFields.join(', ')}</div>
      )}
      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
