import { useEffect, useRef, useState } from 'react'
import {
  useCreateSeries,
  useDeleteSeries,
  useRunSeries,
  useSeries,
  useUpdateSeries,
} from '../hooks/useSeries'
import { useMetadataSearch, useMetadataShow } from '../hooks/useMetadata'
import type {
  MetadataSearchResult,
  MetadataShowDetails,
  MonitoredSeries,
} from '../api/client'
import './Series.css'

/**
 * TMDB-backed title picker. Type 2+ characters → debounced search against
 * /api/metadata/search, results shown as a dropdown. Click a result and we
 * fetch /api/metadata/show/{id} for the canonical name, first_air_date,
 * network, and external_ids.imdb_id. The parent owns the chosen identity
 * (via onSelect) and the raw title text (via value/onChange) — the latter
 * stays editable even after a pick so a user can override (e.g. for shows
 * TMDB has under a slightly different name than the release groups use).
 *
 * Clearing the selection (✕ on the chip) just nulls the TMDB linkage; the
 * title text stays so the user can still submit with no metadata.
 */
function TmdbPicker({
  value,
  onChange,
  selected,
  onSelect,
}: {
  value: string
  onChange: (next: string) => void
  selected: MetadataShowDetails | null
  onSelect: (details: MetadataShowDetails | null) => void
}) {
  const [open, setOpen]   = useState(false)
  const [pickId, setPickId] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Search uses the live input value; results are debounced inside the hook.
  // We gate on `open` so a stale focused-out picker doesn't keep hitting the
  // API when the user has already navigated away mentally.
  const search = useMetadataSearch(value, open && !selected)
  // Show-detail fetch is triggered by the user picking a search result; the
  // resulting payload is what we hand to the parent via onSelect.
  const showDetail = useMetadataShow(pickId, pickId > 0)

  // When the show-detail query settles, hand the payload up and close the
  // dropdown. We deliberately ignore intermediate loading states for the
  // parent — the chip below the input shows a "loading…" state itself.
  useEffect(() => {
    if (showDetail.data && pickId === showDetail.data.id) {
      onSelect(showDetail.data)
      setOpen(false)
    }
  }, [showDetail.data, pickId, onSelect])

  // Close the dropdown when the user clicks outside.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const pickResult = (r: MetadataSearchResult) => {
    // Optimistically reflect the canonical name in the input so the user
    // sees the pick land instantly; full details (imdb_id, network) arrive
    // when useMetadataShow settles.
    onChange(r.name)
    setPickId(r.id)
  }

  const results = search.data?.results ?? []
  const year = (iso: string) => (iso.length >= 4 ? iso.slice(0, 4) : '')

  return (
    <div className="tmdb-picker" ref={containerRef}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value)
          // Editing after a pick clears the linkage — the user is intentionally
          // overriding it. Parent decides whether to keep / discard the
          // associated metadata.
          if (selected) onSelect(null)
          setPickId(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder="Type a show name (e.g. 'real time') — picker uses TMDB"
        required
      />

      {selected && (
        <div className="tmdb-picker__chip">
          <span className="tmdb-picker__chip-name">
            {selected.name}
            {selected.first_air_date && ` (${year(selected.first_air_date)})`}
          </span>
          {selected.networks?.[0]?.name && (
            <span className="tmdb-picker__chip-network">{selected.networks[0].name}</span>
          )}
          {selected.external_ids?.imdb_id && (
            <span className="tmdb-picker__chip-imdb">{selected.external_ids.imdb_id}</span>
          )}
          <button
            type="button"
            className="tmdb-picker__chip-clear"
            onClick={() => { onSelect(null); setPickId(0) }}
            title="Clear TMDB selection (title text stays editable)"
          >
            ✕
          </button>
        </div>
      )}

      {open && !selected && (
        <div className="tmdb-picker__dropdown">
          {search.isLoading && value.trim().length >= 2 && (
            <div className="tmdb-picker__hint">Searching…</div>
          )}
          {search.error && (
            <div className="tmdb-picker__hint tmdb-picker__hint--error">
              {search.error.message}
            </div>
          )}
          {!search.isLoading && results.length === 0 && value.trim().length >= 2 && (
            <div className="tmdb-picker__hint">
              No TMDB matches. You can still type a title and submit without metadata.
            </div>
          )}
          {results.length > 0 && (
            <ul className="tmdb-picker__results">
              {results.slice(0, 8).map(r => (
                <li
                  key={r.id}
                  className="tmdb-picker__result"
                  // mousedown fires before the input's blur, so the click
                  // still registers if focus would otherwise close the
                  // dropdown.
                  onMouseDown={e => { e.preventDefault(); pickResult(r) }}
                >
                  <span className="tmdb-picker__result-name">
                    {r.name}
                    {r.first_air_date && (
                      <span className="tmdb-picker__result-year">
                        {' '}({year(r.first_air_date)})
                      </span>
                    )}
                  </span>
                  {r.overview && (
                    <span className="tmdb-picker__result-overview">
                      {r.overview.length > 110
                        ? r.overview.slice(0, 110) + '…'
                        : r.overview}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (!then) return iso
  const diff = Date.now() - then
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function SeriesRow({
  series,
  onEdit,
}: {
  series: MonitoredSeries
  onEdit: (s: MonitoredSeries) => void
}) {
  const update = useUpdateSeries()
  const remove = useDeleteSeries()
  const run    = useRunSeries()

  return (
    <tr className={series.enabled ? '' : 'series-row--disabled'}>
      <td>
        <strong>{series.title}</strong>
        {series.quality_filter && (
          <span className="series-row__quality">{series.quality_filter}</span>
        )}
        {series.max_size_mb > 0 && (
          <span className="series-row__quality">≤{series.max_size_mb} MB</span>
        )}
        {series.skip_older_seasons && (
          <span className="series-row__quality" title="Only seasons ≥ max on disk">latest</span>
        )}
      </td>
      <td className="series-row__query">{series.query}</td>
      <td className="series-row__interval">{series.interval_minutes}m</td>
      <td className="series-row__when">
        <span title={series.last_checked_at}>
          checked: {formatRelative(series.last_checked_at)}
        </span>
        <span title={series.last_found_at}>
          found: {formatRelative(series.last_found_at)}
        </span>
      </td>
      <td className="series-row__actions">
        <label className="series-row__toggle">
          <input
            type="checkbox"
            checked={series.enabled}
            onChange={() => update.mutate({ id: series.id, payload: { enabled: !series.enabled } })}
          />
          <span>on</span>
        </label>
        <button onClick={() => onEdit(series)}>Edit</button>
        <button
          onClick={() => run.mutate(series.id)}
          disabled={run.isPending || !series.enabled}
        >
          Run now
        </button>
        <button
          className="series-row__delete"
          onClick={() => {
            if (confirm(`Delete "${series.title}"?`)) remove.mutate(series.id)
          }}
          disabled={remove.isPending}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

function AddSeriesForm() {
  const create = useCreateSeries()

  const [title, setTitle] = useState('')
  // TMDB picker selection — set when the user picks a result, cleared when
  // they edit the title manually. Submission threads the IDs/year/network/
  // poster fields through to the daemon when present.
  const [tmdb, setTmdb] = useState<MetadataShowDetails | null>(null)
  // Tracks whether the user has manually edited the query field; once they
  // have, we stop auto-syncing it from the title so we don't blow away their
  // intent if they pick a show after typing.
  const [queryDirty, setQueryDirty] = useState(false)
  const [query, setQueryRaw] = useState('')

  // The three filter knobs persist across page loads and across submits via
  // localStorage. First-time defaults match the user's stated preferences
  // (1080p WEB-DL TV episodes are typically <1GB, so 1000 MB cap fits, and
  // skip_older_seasons matches "I only want new stuff" intent for monitored
  // shows). After first submit, whatever they used last sticks.
  const FILTER_DEFAULTS = { quality: '1080p', maxSize: 1000, skipOlder: true }
  const filterDefaults = (() => {
    try {
      const raw = localStorage.getItem('kanoop.seriesAddDefaults')
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          quality:   typeof parsed.quality   === 'string'  ? parsed.quality   : FILTER_DEFAULTS.quality,
          maxSize:   typeof parsed.maxSize   === 'number'  ? parsed.maxSize   : FILTER_DEFAULTS.maxSize,
          skipOlder: typeof parsed.skipOlder === 'boolean' ? parsed.skipOlder : FILTER_DEFAULTS.skipOlder,
        }
      }
    } catch { /* corrupted storage — fall through */ }
    return FILTER_DEFAULTS
  })()

  const [quality, setQuality] = useState(filterDefaults.quality)
  const [maxSize, setMaxSize] = useState(filterDefaults.maxSize)
  const [skipOlder, setSkipOlder] = useState(filterDefaults.skipOlder)
  const [interval, setInterval] = useState(360)

  const setQuery = (v: string) => { setQueryRaw(v); setQueryDirty(true) }

  const onTitleChange = (v: string) => {
    setTitle(v)
    if (!queryDirty) setQueryRaw(v)
  }

  const onTmdbSelect = (details: MetadataShowDetails | null) => {
    setTmdb(details)
    if (details) {
      // When the picker resolves, also seed the search query with the
      // canonical TMDB name unless the user has manually edited it. The
      // canonical name is what release groups use (it's the same source
      // TheTVDB/IMDB pull from), so the apibay search gets better hits.
      if (!queryDirty) setQueryRaw(details.name)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !query.trim()) return
    const submittedQuality = quality.trim()
    const firstAirYear = tmdb?.first_air_date.slice(0, 4)
    create.mutate(
      {
        title: title.trim(),
        query: query.trim(),
        quality_filter: submittedQuality,
        max_size_mb: maxSize,
        skip_older_seasons: skipOlder,
        interval_minutes: interval,
        enabled: true,
        // TMDB linkage threads through only when the user actually picked
        // a show. A typed-only title submits with these fields omitted —
        // the daemon treats 0/"" as "no metadata" and falls back to
        // title matching, same as legacy rows.
        tmdb_id:        tmdb?.id ?? 0,
        imdb_id:        tmdb?.external_ids?.imdb_id ?? '',
        first_air_year: firstAirYear ? parseInt(firstAirYear, 10) || 0 : 0,
        network:        tmdb?.networks?.[0]?.name ?? '',
        poster_path:    tmdb?.poster_path ?? '',
      },
      {
        onSuccess: () => {
          // Persist the filter knobs so the next add starts where this one
          // left off. Title/query/interval are intentionally NOT persisted —
          // those are per-show.
          try {
            localStorage.setItem('kanoop.seriesAddDefaults', JSON.stringify({
              quality:   submittedQuality,
              maxSize,
              skipOlder,
            }))
          } catch { /* quota / private mode — silently skip */ }

          setTitle('')
          setQueryRaw('')
          setQueryDirty(false)
          setTmdb(null)
          // Filter knobs stick to last-used values rather than reset to blank.
          setQuality(submittedQuality)
          setInterval(360)
        },
      },
    )
  }

  return (
    <form className="series-add" onSubmit={onSubmit}>
      <h3>Add a series</h3>
      <div className="series-add__grid">
        <label>
          <span>Title</span>
          <TmdbPicker
            value={title}
            onChange={onTitleChange}
            selected={tmdb}
            onSelect={onTmdbSelect}
          />
        </label>
        <label>
          <span>Search query</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={title || 'Altered Carbon'}
            required
          />
        </label>
        <label>
          <span>Quality filter</span>
          <input
            value={quality}
            onChange={e => setQuality(e.target.value)}
            placeholder="1080p,WEB-DL (comma-separated, optional)"
          />
        </label>
        <label>
          <span>Max size (MB, 0 = no cap)</span>
          <input
            type="number"
            min={0}
            value={maxSize}
            onChange={e => setMaxSize(parseInt(e.target.value, 10) || 0)}
            placeholder="2500 for 1080p WEB-DL TV"
          />
        </label>
        <label>
          <span>Interval (minutes)</span>
          <input
            type="number"
            min={5}
            max={10080}
            value={interval}
            onChange={e => setInterval(parseInt(e.target.value, 10) || 360)}
          />
        </label>
        <label className="series-add__check">
          <input
            type="checkbox"
            checked={skipOlder}
            onChange={e => setSkipOlder(e.target.checked)}
          />
          <span>Skip older seasons (only newer than what's on disk)</span>
        </label>
      </div>
      <button type="submit" disabled={create.isPending || !title.trim() || !query.trim()}>
        {create.isPending ? 'Adding…' : 'Add series'}
      </button>
      {create.error && <p className="error">{create.error.message}</p>}
    </form>
  )
}

export default function Series() {
  const { data, isLoading, error } = useSeries()
  const series = data?.series ?? []
  const [editing, setEditing] = useState<MonitoredSeries | null>(null)

  return (
    <div className="series">
      <header className="series__header">
        <div>
          <h1>Series</h1>
          <p className="muted">
            Monitored shows. Each one runs through the search adapter on its
            interval; new episodes auto-add (category=tv) after deduping
            against on-disk and in-flight torrents.
          </p>
        </div>
      </header>

      <AddSeriesForm />

      {error && <p className="error">{error.message}</p>}
      {isLoading && <p className="muted">Loading…</p>}

      {series.length === 0 ? (
        <div className="card">
          <p className="muted">No series being monitored yet.</p>
        </div>
      ) : (
        <table className="series-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Query</th>
              <th>Every</th>
              <th>Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {series.map(s => <SeriesRow key={s.id} series={s} onEdit={setEditing} />)}
          </tbody>
        </table>
      )}

      {editing && (
        <EditSeriesModal
          series={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EditSeriesModal({
  series,
  onClose,
}: {
  series: MonitoredSeries
  onClose: () => void
}) {
  const update = useUpdateSeries()
  const [title, setTitle]         = useState(series.title)
  const [query, setQuery]         = useState(series.query)
  const [quality, setQuality]     = useState(series.quality_filter)
  const [maxSize, setMaxSize]     = useState(series.max_size_mb)
  const [skipOlder, setSkipOlder] = useState(series.skip_older_seasons)
  const [interval, setInterval]   = useState(series.interval_minutes)

  // ESC closes the modal — common keyboard expectation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !query.trim()) return
    update.mutate(
      {
        id: series.id,
        payload: {
          title: title.trim(),
          query: query.trim(),
          quality_filter: quality.trim(),
          max_size_mb: maxSize,
          skip_older_seasons: skipOlder,
          interval_minutes: interval,
        },
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <form className="series-add" onSubmit={onSubmit}>
          <h3>Edit "{series.title}"</h3>
          <div className="series-add__grid">
            <label>
              <span>Title</span>
              <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
            </label>
            <label>
              <span>Search query</span>
              <input value={query} onChange={e => setQuery(e.target.value)} required />
            </label>
            <label>
              <span>Quality filter</span>
              <input
                value={quality}
                onChange={e => setQuality(e.target.value)}
                placeholder="1080p,WEB-DL (comma-separated, optional)"
              />
            </label>
            <label>
              <span>Max size (MB, 0 = no cap)</span>
              <input
                type="number"
                min={0}
                value={maxSize}
                onChange={e => setMaxSize(parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              <span>Interval (minutes)</span>
              <input
                type="number"
                min={5}
                max={10080}
                value={interval}
                onChange={e => setInterval(parseInt(e.target.value, 10) || 360)}
              />
            </label>
            <label className="series-add__check">
              <input
                type="checkbox"
                checked={skipOlder}
                onChange={e => setSkipOlder(e.target.checked)}
              />
              <span>Skip older seasons (only newer than what's on disk)</span>
            </label>
          </div>
          {update.error && <p className="error">{update.error.message}</p>}
          <div className="modal__actions">
            <button type="button" onClick={onClose} disabled={update.isPending}>Cancel</button>
            <button type="submit" disabled={update.isPending || !title.trim() || !query.trim()}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
