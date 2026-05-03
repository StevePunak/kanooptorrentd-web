import { useSettingsForm } from './useSettingsForm'

const KEYS = ['control_bind_address', 'control_listen_port'] as const

export default function System() {
  const { data, error, saving, restartFields, update, onSubmit } = useSettingsForm([...KEYS])

  if (error && !data) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  return (
    <form onSubmit={onSubmit}>
      <h3>Control plane</h3>

      <label>Control bind address</label>
      <input type="text" value={data.control_bind_address}
             onChange={e => update('control_bind_address', e.target.value)} />

      <label>Control listen port</label>
      <input type="number" value={data.control_listen_port}
             onChange={e => update('control_listen_port', parseInt(e.target.value, 10))} />

      {restartFields.length > 0 && (
        <div className="warning">Restart required to apply: {restartFields.join(', ')}</div>
      )}
      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
