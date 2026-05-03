import LibraryStateBadge from '../../components/common/LibraryStateBadge'
import { useSettingsForm } from './useSettingsForm'

const KEYS = [
  'tv_shows_path',
  'movies_path',
  'music_path',
  'library_strict',
  'download_dir',
  'resume_dir',
] as const

export default function LibraryPaths() {
  const { data, error, saving, restartFields, update, onSubmit } = useSettingsForm([...KEYS])

  if (error && !data) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <LibraryStateBadge />
      </div>

      <h3>NAS library paths</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        When a torrent is added with a category, the daemon routes it to one of
        these paths. Mount the NAS share via fstab so the daemon sees them as
        local paths. The verifier checks each path on save and on a 30s
        background loop, so a NAS that comes online recovers automatically.
      </p>

      <label>TV shows</label>
      <input type="text" value={data.tv_shows_path}
             onChange={e => update('tv_shows_path', e.target.value)}
             placeholder="/mnt/nas/TV Shows" />

      <label>Movies</label>
      <input type="text" value={data.movies_path}
             onChange={e => update('movies_path', e.target.value)}
             placeholder="/mnt/nas/Movies" />

      <label>Music</label>
      <input type="text" value={data.music_path}
             onChange={e => update('music_path', e.target.value)}
             placeholder="/mnt/nas/Curated Music" />

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <input type="checkbox" checked={data.library_strict}
               onChange={e => update('library_strict', e.target.checked)}
               style={{ width: 'auto', margin: 0 }} />
        <span>Strict mode — refuse to start torrent session if any path is unmounted/unwritable</span>
      </label>
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 'var(--space-1)' }}>
        Leave off if you want torrents to run even when the NAS is unreachable
        (the verifier still surfaces state above for visibility).
      </p>

      <h3 style={{ marginTop: 'var(--space-5)' }}>Local paths</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Default download directory is the fallback for uncategorized torrents.
        Resume data is the daemon's own state; doesn't need NAS storage.
      </p>

      <label>Default download directory</label>
      <input type="text" value={data.download_dir}
             onChange={e => update('download_dir', e.target.value)} />

      <label>Resume data directory</label>
      <input type="text" value={data.resume_dir}
             onChange={e => update('resume_dir', e.target.value)} />

      {restartFields.length > 0 && (
        <div className="warning">Daemon restart required: {restartFields.join(', ')}</div>
      )}
      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
