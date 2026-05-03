import { useHealth } from '../../hooks/useHealth'
import './StatusBanner.css'

export default function StatusBanner() {
  const { error } = useHealth()

  if (!error) return null
  return (
    <div className="status-banner" role="alert">
      <strong>Daemon unreachable</strong>
      <span>{error.message}</span>
    </div>
  )
}
