import { NavLink } from 'react-router-dom'
import './SideNav.css'

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard' },
  { to: '/torrents',  label: 'Torrents' },
  { to: '/search',    label: 'Search' },
  { to: '/library',   label: 'Library' },
  { to: '/series',    label: 'Series' },
  { to: '/settings',  label: 'Settings' },
]

interface SideNavProps {
  onNavigate?: () => void
}

export default function SideNav({ onNavigate }: SideNavProps) {
  return (
    <nav className="sidenav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `sidenav__link ${isActive ? 'sidenav__link--active' : ''}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
