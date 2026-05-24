import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLibraryRecentEpisodes } from '../hooks/useLibrary'
import './RecentEpisodesModal.css'

type Props = {
  showTitle: string
  days: number
  onClose: () => void
}

const EPISODE_RE = /S(\d{1,2})E(\d{1,3})/i

function episodeLabel(relPath: string): string {
  const m = relPath.match(EPISODE_RE)
  if (m) {
    const s = m[1].padStart(2, '0')
    const e = m[2].padStart(2, '0')
    return `S${s}E${e}`
  }
  const base = relPath.split('/').pop() ?? relPath
  return base.replace(/\.[^.]+$/, '')
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function RecentEpisodesModal({ showTitle, days, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const { isLoading, error, episodes } = useLibraryRecentEpisodes(showTitle, days)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => {
      previouslyFocusedRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="recent-episodes-modal__backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="recent-episodes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-episodes-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="recent-episodes-modal__header">
          <div className="recent-episodes-modal__heading">
            <h3
              id="recent-episodes-modal-title"
              className="recent-episodes-modal__title"
            >
              {showTitle}
            </h3>
            {!isLoading && !error && (
              <p className="recent-episodes-modal__subtitle">
                {episodes.length} new in last {days} days
              </p>
            )}
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="recent-episodes-modal__close-x"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="recent-episodes-modal__body">
          {isLoading && <p className="muted">Loading…</p>}
          {error && <p className="error">{error.message}</p>}
          {!isLoading && !error && episodes.length === 0 && (
            <p className="muted">No matching episode files.</p>
          )}
          {!isLoading && !error && episodes.length > 0 && (
            <ul className="recent-episodes-modal__list">
              {episodes.map(ep => (
                <li
                  key={ep.rel_path}
                  className="recent-episodes-modal__row"
                >
                  <span className="recent-episodes-modal__label">
                    {episodeLabel(ep.rel_path)}
                  </span>
                  <span
                    className="recent-episodes-modal__date"
                    title={ep.mtime}
                  >
                    {formatRelative(ep.mtime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="recent-episodes-modal__footer">
          <button
            type="button"
            className="recent-episodes-modal__close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
