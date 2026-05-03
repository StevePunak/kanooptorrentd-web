import { useHealth } from '../../hooks/useHealth'
import './ProxyStateBadge.css'

const STATE_LABEL: Record<string, string> = {
  disabled:  'Direct (no proxy)',
  verifying: 'Verifying',
  verified:  'Verified',
  failed:    'Failed',
}

export default function ProxyStateBadge() {
  const { data, error } = useHealth()
  if (error || !data) return null

  // Older daemons predate the proxy gate and won't include this block. Render
  // nothing rather than crashing — the page above us is more important.
  const proxy = data.proxy
  if (!proxy) return null

  const cls = `proxy-badge proxy-badge--${proxy.state}`
  const label = STATE_LABEL[proxy.state] ?? proxy.state

  return (
    <div className={cls}>
      <span className="proxy-badge__dot" aria-hidden="true" />
      <span className="proxy-badge__label">Gate: {label}</span>
      {proxy.state === 'verified' && proxy.exit_ip && (
        <span className="proxy-badge__detail">exit IP {proxy.exit_ip}</span>
      )}
      {proxy.state === 'failed' && proxy.last_error && (
        <span className="proxy-badge__detail">{proxy.last_error}</span>
      )}
    </div>
  )
}
