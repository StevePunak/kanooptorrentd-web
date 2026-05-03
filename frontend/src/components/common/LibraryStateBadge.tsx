import { useHealth } from '../../hooks/useHealth'
import './LibraryStateBadge.css'

const STATE_LABEL: Record<string, string> = {
  ready:  'Library ready',
  failed: 'Library failed',
}

const PATH_STATE_LABEL: Record<string, string> = {
  ready:        'Ready',
  missing:      'Missing',
  not_writable: 'Not writable',
}

export default function LibraryStateBadge() {
  const { data, error } = useHealth()
  if (error || !data) return null

  // Older daemons don't ship a library block — render nothing rather than crash.
  const lib = data.library
  if (!lib) return null

  const cls = `library-badge library-badge--${lib.state}`
  const label = STATE_LABEL[lib.state] ?? lib.state
  const failedCount = lib.paths.filter(p => p.state !== 'ready').length

  return (
    <div className={cls}>
      <div className="library-badge__head">
        <span className="library-badge__dot" aria-hidden="true" />
        <span className="library-badge__label">{label}</span>
        {!lib.strict && (
          <span className="library-badge__detail">informational (strict mode off)</span>
        )}
        {lib.strict && lib.state === 'failed' && (
          <span className="library-badge__detail">strict mode — session held</span>
        )}
      </div>
      {failedCount > 0 && (
        <ul className="library-badge__paths">
          {lib.paths.filter(p => p.state !== 'ready').map((p) => (
            <li key={p.path}>
              <code>{p.path}</code>
              <span className="library-badge__path-state">{PATH_STATE_LABEL[p.state] ?? p.state}</span>
              {p.error && <span className="library-badge__path-error">{p.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
