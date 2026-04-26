import { useEffect, useState, type FormEvent } from 'react'
import { api, type Settings as SettingsType } from '../api/client'

export default function Settings() {
  const [data, setData] = useState<SettingsType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [restartFields, setRestartFields] = useState<string[]>([])

  useEffect(() => {
    api.getSettings().then(setData).catch(e => setError(e.message))
  }, [])

  if (error) return <div><h1>Settings</h1><p className="error">{error}</p></div>
  if (!data) return <div><h1>Settings</h1><p>Loading…</p></div>

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await api.putSettings(data)
      setRestartFields(result.requires_restart)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const update = (k: keyof SettingsType, v: string | number) =>
    setData({ ...data, [k]: v })

  return (
    <form onSubmit={onSave}>
      <h1>Settings</h1>

      <label>Download directory</label>
      <input type="text" value={data.download_dir}
             onChange={e => update('download_dir', e.target.value)} />

      <label>Resume data directory</label>
      <input type="text" value={data.resume_dir}
             onChange={e => update('resume_dir', e.target.value)} />

      <label>Torrent listen port</label>
      <input type="number" value={data.listen_port}
             onChange={e => update('listen_port', parseInt(e.target.value, 10))} />

      <label>Control bind address</label>
      <input type="text" value={data.control_bind_address}
             onChange={e => update('control_bind_address', e.target.value)} />

      <label>Control listen port</label>
      <input type="number" value={data.control_listen_port}
             onChange={e => update('control_listen_port', parseInt(e.target.value, 10))} />

      {restartFields.length > 0 && (
        <div className="warning">
          Restart required to apply: {restartFields.join(', ')}
        </div>
      )}

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
