import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import System from './System'
import Torrent from './Torrent'
import Proxy from './Proxy'
import LibraryPaths from './LibraryPaths'
import './Settings.css'

const SUB_TABS = [
  { to: '/settings/system',  label: 'System' },
  { to: '/settings/torrent', label: 'Torrent' },
  { to: '/settings/proxy',   label: 'Proxy' },
  { to: '/settings/library', label: 'Library' },
]

export default function Settings() {
  return (
    <div className="settings">
      <h1>Settings</h1>
      <nav className="settings__subnav">
        {SUB_TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `settings__subtab ${isActive ? 'settings__subtab--active' : ''}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="settings__panel card">
        <Routes>
          <Route index element={<Navigate to="/settings/system" replace />} />
          <Route path="system"  element={<System />} />
          <Route path="torrent" element={<Torrent />} />
          <Route path="proxy"   element={<Proxy />} />
          <Route path="library" element={<LibraryPaths />} />
        </Routes>
      </div>
    </div>
  )
}
