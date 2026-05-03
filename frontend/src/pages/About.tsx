import { useVersion } from '../hooks/useVersion'

export default function About() {
  const { data, error, isLoading } = useVersion()

  return (
    <div>
      <h1>About</h1>
      <div className="card">
        <h3>KanoopTorrentD</h3>
        {error && <p className="error">{error.message}</p>}
        {isLoading && <p className="muted">Loading…</p>}
        {data && (
          <dl>
            <dt>Version</dt><dd>{data.version}</dd>
            <dt>Git SHA</dt><dd>{data.git_sha}</dd>
            <dt>Built</dt><dd>{new Date(data.build_timestamp).toLocaleString()}</dd>
            <dt>Qt</dt><dd>{data.qt_version}</dd>
          </dl>
        )}
      </div>
    </div>
  )
}
