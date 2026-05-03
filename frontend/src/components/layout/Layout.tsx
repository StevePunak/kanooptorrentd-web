import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SideNav from './SideNav'
import StatusBanner from './StatusBanner'
import './Layout.css'

// public/ assets aren't auto-prefixed with BASE_URL when referenced from JSX,
// so we have to do it ourselves to survive the /apps/kanooptorrentd/ mount.
const brandSvg = `${import.meta.env.BASE_URL}images/brand.svg`

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className={`layout ${drawerOpen ? 'layout--drawer-open' : ''}`}>
      <aside className="layout__sidebar">
        <div className="layout__brand">
          <img src={brandSvg} alt="" className="layout__brand-mark" />
          <span className="layout__brand-name">KanoopTorrentD</span>
        </div>
        <SideNav onNavigate={closeDrawer} />
        <div className="layout__sidebar-footer">
          <Link to="/about" onClick={closeDrawer}>About</Link>
          <span className="layout__quote">The spice must flow.</span>
        </div>
      </aside>

      <div
        className="layout__backdrop"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div className="layout__content">
        <header className="layout__topbar">
          <button
            type="button"
            className="layout__hamburger"
            aria-label="Toggle navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
          <img src={brandSvg} alt="" className="layout__topbar-mark" />
          <span className="layout__topbar-name">KanoopTorrentD</span>
        </header>
        <StatusBanner />
        <main className="layout__main">{children}</main>
      </div>
    </div>
  )
}
