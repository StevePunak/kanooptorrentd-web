import { useEffect, useState, type FormEvent } from 'react'
import ProxyStateBadge from '../../components/common/ProxyStateBadge'
import { type Settings } from '../../api/client'
import { useSettings, useSettingsMutation } from '../../hooks/useSettings'

type ProxySlice = Pick<
  Settings,
  'proxy_mode' | 'proxy_host' | 'proxy_port' | 'proxy_username' | 'proxy_verify_url'
>

export default function Proxy() {
  const { data: full, error: queryError, isLoading } = useSettings()
  const mutation = useSettingsMutation()

  const [edits, setEdits] = useState<ProxySlice | null>(null)
  // Password is intentionally separate. The daemon never echoes it back, so
  // we always start with an empty field. We only include it in the PUT when
  // the user actually types something.
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (full && !edits) {
      // Tolerate older daemons that predate the proxy fields by falling back
      // to sensible defaults rather than rendering uncontrolled inputs.
      setEdits({
        proxy_mode:       full.proxy_mode       ?? 'direct',
        proxy_host:       full.proxy_host       ?? '',
        proxy_port:       full.proxy_port       ?? 1080,
        proxy_username:   full.proxy_username   ?? '',
        proxy_verify_url: full.proxy_verify_url ?? 'https://api.ipify.org',
      })
    }
  }, [full, edits])

  const update = <K extends keyof ProxySlice>(key: K, value: ProxySlice[K]) => {
    setEdits(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!edits) return
    const payload: Partial<Settings> = { ...edits }
    if (newPassword.length > 0) payload.proxy_password = newPassword
    mutation.mutate(payload, {
      onSuccess: () => setNewPassword(''),
    })
  }

  if (queryError && !edits) return <p className="error">{queryError.message}</p>
  if (isLoading || !edits) return <p className="muted">Loading…</p>

  const errorMsg = mutation.error?.message ?? null
  const restartFields = mutation.data?.requires_restart ?? []

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <ProxyStateBadge />
      </div>

      <h3>SOCKS5 proxy</h3>

      <label>Mode</label>
      <select
        value={edits.proxy_mode}
        onChange={e => update('proxy_mode', e.target.value)}
        style={{
          width: '100%',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <option value="direct">Direct (no proxy — torrent traffic goes from this host's IP)</option>
        <option value="socks5_strict">SOCKS5 Strict (gate the session until proxy is verified)</option>
      </select>

      <label>Proxy host</label>
      <input type="text" value={edits.proxy_host}
             onChange={e => update('proxy_host', e.target.value)}
             placeholder="e.g. 127.0.0.1" />

      <label>Proxy port</label>
      <input type="number" value={edits.proxy_port}
             onChange={e => update('proxy_port', parseInt(e.target.value, 10))} />

      <label>Username (optional)</label>
      <input type="text" value={edits.proxy_username}
             onChange={e => update('proxy_username', e.target.value)} />

      <label>Password</label>
      <input type="password" value={newPassword}
             onChange={e => setNewPassword(e.target.value)}
             placeholder="(leave blank to keep current)" />

      <label>Verification URL</label>
      <input type="text" value={edits.proxy_verify_url}
             onChange={e => update('proxy_verify_url', e.target.value)}
             placeholder="https://api.ipify.org" />

      <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem' }}>
        Saving applies changes live: the daemon tears down the libtorrent session
        and brings it back up under the new config. Any active torrents pause
        briefly. The verifier re-runs immediately so you can confirm reachability.
      </p>

      {restartFields.length > 0 && (
        <div className="warning">Daemon restart required: {restartFields.join(', ')}</div>
      )}
      {errorMsg && <p className="error">{errorMsg}</p>}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save & verify'}
      </button>
    </form>
  )
}
