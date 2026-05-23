import { useEffect, useRef, useState } from 'react'
import {
  useMetadataAlbumGuess,
  useMetadataAlbumSearch,
  useMusicIdentity,
  useSetMusicIdentity,
} from '../hooks/useMusicIdentity'
import type { MetadataAlbumSearchResult } from '../api/client'
import './MoviePicker.css'  // shared modal CSS — picker shapes are identical

function albumYear(iso: string | undefined): string {
  return iso && iso.length >= 4 ? iso.slice(0, 4) : ''
}

function joinCredit(credit: MetadataAlbumSearchResult['artist-credit']): string {
  if (!credit) return ''
  return credit
    .map(c => (c.name ?? '') + (c.joinphrase ?? ''))
    .join('')
    .trim()
}

export function MusicPicker({
  infoHash,
  fallbackTitle,
  onClose,
}: {
  infoHash: string
  fallbackTitle: string
  onClose: () => void
}) {
  const identity = useMusicIdentity(infoHash, true)
  const setIdentity = useSetMusicIdentity(infoHash)
  const guess = useMetadataAlbumGuess(infoHash, true)

  // Three separate inputs. Seeded from the daemon's guess (clean), with
  // a one-shot init guard so editing isn't fought by re-seeding when the
  // guess query resolves.
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [year, setYear] = useState<number>(0)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    // Prefer an existing identity (operator already chose) over the guess.
    const ident = identity.data
    if (ident && (ident.artist || ident.album)) {
      setArtist(ident.artist)
      setAlbum(ident.album)
      setYear(ident.year)
      initialized.current = true
      return
    }
    if (guess.data) {
      setArtist(guess.data.artist)
      setAlbum(guess.data.album)
      setYear(guess.data.year)
      initialized.current = true
    }
  }, [identity.data, guess.data])

  const search = useMetadataAlbumSearch(artist, album, year, initialized.current)
  const dialogRef = useRef<HTMLDivElement>(null)

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

  const pickResult = (r: MetadataAlbumSearchResult) => {
    setIdentity.mutate(r.id, { onSuccess: () => onClose() })
  }

  const results = search.data?.['release-groups'] ?? []
  const sourceBadge = guess.data
    ? guess.data.source === 'tags'
      ? `seed from tags (${guess.data.confidence})`
      : 'seed from torrent name (no tags on disk yet)'
    : ''

  return (
    <div className="movie-picker-backdrop">
      <div className="movie-picker" ref={dialogRef}>
        <header className="movie-picker__header">
          <h3>Identify album</h3>
          <button type="button" className="movie-picker__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {identity.data && identity.data.album && (
          <div className="movie-picker__current">
            Currently bound:{' '}
            <strong>
              {identity.data.artist || 'Unknown Artist'} — {identity.data.album}
              {identity.data.year > 0 && ` (${identity.data.year})`}
            </strong>
            {identity.data.mbid && (
              <span className="movie-picker__imdb">{identity.data.mbid.slice(0, 8)}</span>
            )}
          </div>
        )}

        <div className="movie-picker__current" title={fallbackTitle}>
          Torrent: <strong>{fallbackTitle}</strong>
        </div>

        <div className="tmdb-picker">
          <div className="music-picker__fields">
            <label>
              <span>Artist</span>
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Artist credit"
                autoFocus
              />
            </label>
            <label>
              <span>Album</span>
              <input
                value={album}
                onChange={e => setAlbum(e.target.value)}
                placeholder="Release-group title"
              />
            </label>
            <label>
              <span>Year</span>
              <input
                type="number"
                value={year || ''}
                onChange={e => setYear(parseInt(e.target.value, 10) || 0)}
                placeholder="YYYY"
                min={1900}
                max={2100}
              />
            </label>
          </div>

          {sourceBadge && (
            <div className="tmdb-picker__hint music-picker__seed">{sourceBadge}</div>
          )}

          <div className="tmdb-picker__dropdown movie-picker__dropdown">
            {search.isLoading && album.length >= 2 && (
              <div className="tmdb-picker__hint">Searching MusicBrainz…</div>
            )}
            {search.error && (
              <div className="tmdb-picker__hint tmdb-picker__hint--error">
                {(search.error as Error).message}
              </div>
            )}
            {!search.isLoading && results.length === 0 && album.length >= 2 && (
              <div className="tmdb-picker__hint">No MusicBrainz matches.</div>
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
                      {joinCredit(r['artist-credit']) || 'Unknown Artist'} — {r.title}
                      {r['first-release-date'] && (
                        <span className="tmdb-picker__result-year">
                          {' '}({albumYear(r['first-release-date'])})
                        </span>
                      )}
                    </span>
                    {r['primary-type'] && (
                      <span className="tmdb-picker__result-overview">
                        {r['primary-type']}
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
