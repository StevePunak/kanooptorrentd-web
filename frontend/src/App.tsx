import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Health from './pages/Health'
import Settings from './pages/Settings'
import Version from './pages/Version'

export default function App() {
  return (
    <div className="app">
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
