import { useState, type FormEvent } from 'react'
import { type LibraryCategory, type SearchResultRow } from '../api/client'
import { useAddTorrentMutation, useSearchMutation } from '../hooks/useSearch'
import './Search.css'

function formatAdded(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

// Default the per-row library category from the apibay search category.
// "video" is ambiguous between tv and movie — default to movie since most
// single-release torrents are movies; user can override before clicking Add.
function defaultCategoryFromSearch(searchCategory: string): LibraryCategory {
  const c = searchCategory.toLowerCase()
  if (c === 'audio') return 'music'
  if (c === 'video') return 'movie'
  return 'other'
}

const CATEGORY_LABELS: { value: LibraryCategory; label: string }[] = [
  { value: 'tv',    label: 'TV' },
  { value: 'movie', label: 'Movie' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' },
]

function SearchRow({ row }: { row: SearchResultRow }) {
  const add = useAddTorrentMutation()
  const [category, setCategory] = useState<LibraryCategory>(
    defaultCategoryFromSearch(row.category)
  )

  let label = 'Add'
  let extraClass = ''
  if (add.isPending) {
    label = 'Adding…'
  } else if (add.isSuccess) {
    label = 'Added ✓'
    extraClass = ' search__add--added'
  } else if (add.isError) {
    label = 'Retry'
  }

  return (
    <tr className="search__row">
      <td className="search__name" title={row.name}>{row.name}</td>
      <td className="search__num">{row.size_human}</td>
      <td className="search__num search__num--seed">{row.seeders.toLocaleString()}</td>
      <td className="search__num search__num--leech">{row.leechers.toLocaleString()}</td>
      <td className="search__date">{formatAdded(row.added_date)}</td>
      <td className="search__uploader">{row.uploader_name || '—'}</td>
      <td className="search__action">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LibraryCategory)}
          disabled={add.isPending || add.isSuccess}
          className="search__category-pick"
          aria-label="Save under category"
        >
          {CATEGORY_LABELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => add.mutate({ magnet: row.magnet, category })}
          disabled={add.isPending || add.isSuccess}
          className={`search__add${extraClass}`}
          title={add.isSuccess ? `info_hash: ${add.data?.info_hash}` : undefined}
        >
          {label}
        </button>
        {add.isError && <div className="search__add-error">{add.error.message}</div>}
      </td>
    </tr>
  )
}

const CATEGORIES = [
  { value: 'any',          label: 'Any' },
  { value: 'video',        label: 'Video' },
  { value: 'audio',        label: 'Audio' },
  { value: 'applications', label: 'Apps' },
  { value: 'games',        label: 'Games' },
  { value: 'other',        label: 'Other' },
] as const

export default function Search() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('any')
  const search = useSearchMutation()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) search.mutate({ query: q, category })
  }

  const sorted = search.data?.results
    ? [...search.data.results].sort((a, b) => b.seeders - a.seeders)
    : []

  return (
    <div className="search">
      <h1>Search</h1>

      <form className="search__form" onSubmit={onSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apibay.org…"
          className="search__input"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="search__category"
          aria-label="Category"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button type="submit" disabled={search.isPending || query.trim() === ''}>
          {search.isPending ? 'Searching…' : 'Search'}
        </button>
      </form>

      {search.isError && <p className="error">{search.error.message}</p>}

      {search.data && sorted.length === 0 && !search.isPending && (
        <p className="muted">No results for &ldquo;{search.data.query}&rdquo;.</p>
      )}

      {sorted.length > 0 && (
        <table className="search__results">
          <thead>
            <tr>
              <th>Name</th>
              <th className="search__num-head">Size</th>
              <th className="search__num-head">Seed</th>
              <th className="search__num-head">Leech</th>
              <th>Added</th>
              <th>Uploader</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <SearchRow key={row.info_hash} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
