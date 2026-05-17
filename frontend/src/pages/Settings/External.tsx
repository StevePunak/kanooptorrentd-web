import { useState, type FormEvent } from 'react'
import { type Settings } from '../../api/client'
import { useSettingsMutation } from '../../hooks/useSettings'

/**
 * External service credentials — write-only over the daemon's wire
 * (mirrors proxy_password). The daemon never echoes the values back on
 * GET, so each load starts with empty fields and the placeholder "(leave
 * blank to keep current)" tells the user a value is already persisted.
 *
 * Only the values the user actually types this submit are included in
 * the PUT — that way an empty submit on this tab can't accidentally
 * clear a previously-set credential.
 */
export default function External() {
  const mutation = useSettingsMutation()

  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [tmdbAccessToken, setTmdbAccessToken] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const payload: Partial<Settings> = {}
    if (tmdbApiKey.length > 0)       payload.tmdb_api_key       = tmdbApiKey
    if (tmdbAccessToken.length > 0)  payload.tmdb_access_token  = tmdbAccessToken
    if (Object.keys(payload).length === 0) return  // nothing to send
    mutation.mutate(payload, {
      onSuccess: () => {
        setTmdbApiKey('')
        setTmdbAccessToken('')
      },
    })
  }

  const errorMsg = mutation.error?.message ?? null

  return (
    <form onSubmit={onSubmit}>
      <h3>TMDB (themoviedb.org)</h3>
      <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
        Show-metadata API for the series watcher's title/year/IDs picker.
        Get both values from your TMDB account at{' '}
        <code style={{ fontFamily: 'var(--font-mono)' }}>
          themoviedb.org → Settings → API
        </code>
        . The v3 key drives query-param-style endpoints; the v4 bearer
        token drives newer JSON endpoints. Either is usable on its own —
        store whichever you have.
      </p>

      <label>v3 API key</label>
      <input type="password"
             value={tmdbApiKey}
             onChange={e => setTmdbApiKey(e.target.value)}
             autoComplete="off"
             placeholder="(leave blank to keep current)" />

      <label>v4 API Read Access Token</label>
      <input type="password"
             value={tmdbAccessToken}
             onChange={e => setTmdbAccessToken(e.target.value)}
             autoComplete="off"
             placeholder="(leave blank to keep current)" />

      <p className="muted" style={{
        marginTop: 'var(--space-3)',
        fontSize: '0.85rem',
      }}>
        Stored write-only — the daemon never sends these back to the UI.
        Submitting with both fields empty does nothing. To clear a
        credential, type a single space and save.
      </p>

      {errorMsg && <p className="error">{errorMsg}</p>}

      <button type="submit"
              disabled={
                mutation.isPending ||
                (tmdbApiKey.length === 0 && tmdbAccessToken.length === 0)
              }>
        {mutation.isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
