import { useEffect, useRef, useState } from 'react'
import { useMetadataMovieSearch } from '../hooks/useMetadata'
import { useMovieIdentity, useSetMovieIdentity } from '../hooks/useMovieIdentity'
import type { MetadataMovieSearchResult } from '../api/client'
import './MoviePicker.css'

/** Modal that binds a TMDB movie identity to a torrent. The daemon's
 *  completion handler refuses to write to moviesRoot until an identity has
 *  been chosen, so this is what unsticks a movie torrent that completed
 *  with no metadata. Pattern mirrors the TV TmdbPicker in Series.tsx —
 *  search → pick → resolve full detail on PUT (the daemon resolves
 *  title/year/imdb/poster from tmdb_id on its side, so we only send the id).
 */
export function MoviePicker({
  infoHash,
  fallbackTitle,
  onClose,
}: {
  infoHash: string
  fallbackTitle: string
  onClose: () => void
}) {
  const identity = useMovieIdentity(infoHash, true)
  const setIdentity = useSetMovieIdentity(infoHash)

  // Seed the input with the torrent's release name so the operator sees
  // something to edit rather than a blank box. Once identity loads we
  // prefer the canonical title. The daemon does heavier normalization
  // (year extraction, quality/codec tag stripping) at add-time for the
  // auto-bind path; the picker only opens for the multi-match disambiguation
  // case, where the operator can re-type whatever query they like.
  const [query, setQuery] = useState(fallbackTitle)
  useEffect(() => {
    if (identity.data?.title) setQuery(identity.data.title)
  }, [identity.data?.title])

  const search = useMetadataMovieSearch(query, true)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape closes; click outside closes. Mirror the Series picker so the
  // modal feels consistent across the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDocClick = (e: MouseEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [onClose])

  const pickResult = (r: MetadataMovieSearchResult) => {
    setIdentity.mutate(r.id, { onSuccess: () => onClose() })
  }

  const year = (iso: string) => (iso.length >= 4 ? iso.slice(0, 4) : '')
  const results = search.data?.results ?? []

  return (
    <div className="movie-picker-backdrop">
      <div className="movie-picker" ref={dialogRef}>
        <header className="movie-picker__header">
          <h3>Identify movie</h3>
          <button type="button" className="movie-picker__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {identity.data && (
          <div className="movie-picker__current">
            Currently bound:{' '}
            <strong>
              {identity.data.title}
              {identity.data.year > 0 && ` (${identity.data.year})`}
            </strong>
            {identity.data.imdb_id && (
              <span className="movie-picker__imdb">{identity.data.imdb_id}</span>
            )}
          </div>
        )}

        <div className="tmdb-picker">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a movie title — e.g. 'lawrence of arabia'"
            autoFocus
          />

          <div className="tmdb-picker__dropdown movie-picker__dropdown">
            {search.isLoading && query.trim().length >= 2 && (
              <div className="tmdb-picker__hint">Searching TMDB…</div>
            )}
            {search.error && (
              <div className="tmdb-picker__hint tmdb-picker__hint--error">
                {(search.error as Error).message}
              </div>
            )}
            {!search.isLoading && results.length === 0 && query.trim().length >= 2 && (
              <div className="tmdb-picker__hint">No TMDB matches.</div>
            )}
            {results.length > 0 && (
              <ul className="tmdb-picker__results">
                {results.slice(0, 10).map(r => (
                  <li
                    key={r.id}
                    className="tmdb-picker__result"
                    onMouseDown={e => { e.preventDefault(); pickResult(r) }}
                  >
                    <span className="tmdb-picker__result-name">
                      {r.title}
                      {r.release_date && (
                        <span className="tmdb-picker__result-year">
                          {' '}({year(r.release_date)})
                        </span>
                      )}
                    </span>
                    {r.overview && (
                      <span className="tmdb-picker__result-overview">
                        {r.overview.length > 140
                          ? r.overview.slice(0, 140) + '…'
                          : r.overview}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {setIdentity.isPending && (
          <p className="movie-picker__status">Binding identity…</p>
        )}
        {setIdentity.error && (
          <p className="movie-picker__status movie-picker__status--error">
            {(setIdentity.error as Error).message}
          </p>
        )}
      </div>
    </div>
  )
}
