import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api/client'
import Health from './pages/Health'
import Settings from './pages/Settings'
import Version from './pages/Version'

function DaemonStatusBanner() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = () => {
      api.health()
        .then(() => { if (!cancelled) setError(null) })
        .catch(e => { if (!cancelled) setError(e.message) })
    }
    check()
    const id = setInterval(check, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (!error) return null
  return (
    <div className="daemon-down" role="alert">
      <strong>Daemon unreachable</strong>
      <span>{error}</span>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <DaemonStatusBanner />
      <nav>
        <NavLink to="/health">Health</NavLink>
        <NavLink to="/version">Version</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/health" replace />} />
          <Route path="/health" element={<Health />} />
          <Route path="/version" element={<Version />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
