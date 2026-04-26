import { useEffect, useState } from 'react'
import { api, type Version as VersionType } from '../api/client'

export default function Version() {
  const [data, setData] = useState<VersionType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.version().then(setData).catch(e => setError(e.message))
  }, [])

  if (error) return <div><h1>Version</h1><p className="error">{error}</p></div>
  if (!data) return <div><h1>Version</h1><p>Loading…</p></div>

  return (
    <div>
      <h1>Version</h1>
      <dl>
        <dt>Version</dt><dd>{data.version}</dd>
        <dt>Git SHA</dt><dd>{data.git_sha}</dd>
        <dt>Built</dt><dd>{new Date(data.build_timestamp).toLocaleString()}</dd>
        <dt>Qt</dt><dd>{data.qt_version}</dd>
      </dl>
    </div>
  )
}
