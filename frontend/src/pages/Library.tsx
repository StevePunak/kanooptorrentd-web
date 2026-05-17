import { memo, useMemo, useState } from 'react'
import LibraryStateBadge from '../components/common/LibraryStateBadge'
import { useHealth } from '../hooks/useHealth'
import { useLibraryFiles, useRescanLibrary } from '../hooks/useLibrary'
import type { LibraryFile } from '../api/client'
import './Library.css'

const CATEGORY_ORDER = ['tv', 'movie', 'music', 'other'] as const
const CATEGORY_LABEL: Record<string, string> = {
  tv:    'TV Shows',
  movie: 'Movies',
  music: 'Music',
  other: 'Other',
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatRelative(iso: string): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!then) return iso
  const diff = Date.now() - then
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function groupByCategory(files: LibraryFile[]): Record<string, LibraryFile[]> {
  const out: Record<string, LibraryFile[]> = {}
  for (const f of files) {
    const c = f.category || 'other'
    if (!out[c]) out[c] = []
    out[c].push(f)
  }
  return out
}

interface DirNode {
  kind: 'dir'
  name: string
  // children is a Map during construction (O(1) dedup of path segments) and
  // a pre-sorted array post-finalize. We keep it on a single field since the
  // builder discards the Map after finalize and rendering only reads the array.
  children: TreeNode[]
  fileCount: number
  totalSize: number
}

interface FileNode {
  kind: 'file'
  name: string
  size: number
  key: string
}

type TreeNode = DirNode | FileNode

interface BuildDir {
  kind: 'dir'
  name: string
  childMap: Map<string, BuildDir | FileNode>
  fileCount: number
  totalSize: number
}

function makeBuildDir(name: string): BuildDir {
  return { kind: 'dir', name, childMap: new Map(), fileCount: 0, totalSize: 0 }
}

// Construct + sort once. Building uses a Map for O(1) lookup; finalize converts
// to sorted arrays so render-time work is just iteration.
//
// Sort: dirs before files, then by Intl.Collator (numeric: true) — single
// allocated collator, vastly cheaper than per-call localeCompare(numeric).
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compareNodes(a: BuildDir | FileNode, b: BuildDir | FileNode): number {
  if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
  return collator.compare(a.name, b.name)
}

function finalize(d: BuildDir): DirNode {
  const arr: (BuildDir | FileNode)[] = Array.from(d.childMap.values())
  arr.sort(compareNodes)
  const children: TreeNode[] = arr.map(c =>
    c.kind === 'dir' ? finalize(c) : c
  )
  return {
    kind: 'dir',
    name: d.name,
    children,
    fileCount: d.fileCount,
    totalSize: d.totalSize,
  }
}

// Build a tree from rel_path segments. Each file's rel_path is split on '/'
// and inserted into nested dirs; the leaf is a FileNode. fileCount and
// totalSize on each ancestor reflect everything below it.
function buildTree(files: LibraryFile[]): DirNode {
  const root = makeBuildDir('')
  for (const f of files) {
    const segs = f.rel_path.split('/').filter(Boolean)
    if (segs.length === 0) continue
    const ancestors: BuildDir[] = []
    let cursor = root
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i]
      const existing = cursor.childMap.get(seg)
      let next: BuildDir
      if (existing && existing.kind === 'dir') {
        next = existing
      } else {
        next = makeBuildDir(seg)
        cursor.childMap.set(seg, next)
      }
      ancestors.push(cursor)
      cursor = next
    }
    const leaf: FileNode = {
      kind: 'file',
      name: segs[segs.length - 1],
      size: f.size_bytes,
      key: `${f.base_path}//${f.rel_path}`,
    }
    cursor.childMap.set(leaf.name, leaf)
    // Roll the file's size+count up to every dir on its path: every intermediate
    // ancestor + the immediate-parent dir (cursor). When the file lives at the
    // root level, ancestors is empty and cursor is root — so a single increment
    // on root.
    for (const dir of [...ancestors, cursor]) {
      dir.fileCount += 1
      dir.totalSize += f.size_bytes
    }
  }
  return finalize(root)
}

const TreeBranch = memo(function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  // CSS variable instead of inline padding-left so we don't allocate a fresh
  // style object every render of every visible branch.
  const style = { '--depth': depth } as React.CSSProperties

  if (node.kind === 'file') {
    return (
      <div className="library__file" style={style}>
        <span className="library__file-path">{node.name}</span>
        <span className="library__file-size">{formatBytes(node.size)}</span>
      </div>
    )
  }

  // Lazy-mount: collapsed dirs contribute nothing to the DOM. The native
  // <details> element still drives the open/close UX, but children only render
  // while the branch is open. For a NAS-scale tree (thousands of files), this
  // is the difference between "everything in the DOM hidden" and "only what's
  // visible." Re-mounting on each open is fine — there's no scroll state
  // worth preserving per branch.
  const [open, setOpen] = useState(false)

  return (
    <details
      className="library__dir"
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary className="library__dir-summary" style={style}>
        <span className="library__dir-name">{node.name}</span>
        <span className="library__dir-meta">
          {node.fileCount} {node.fileCount === 1 ? 'file' : 'files'}
          {' · '}
          {formatBytes(node.totalSize)}
        </span>
      </summary>
      {open && (
        <div className="library__dir-children">
          {node.children.map(child => (
            <TreeBranch
              key={child.kind === 'dir' ? `d:${child.name}` : child.key}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </details>
  )
})

export default function Library() {
  const { data: health } = useHealth()
  const { data, isLoading, error } = useLibraryFiles()
  const rescan = useRescanLibrary()

  const grouped = useMemo(() => groupByCategory(data?.files ?? []), [data])
  const trees = useMemo(() => {
    const out: Record<string, DirNode> = {}
    for (const cat of CATEGORY_ORDER) {
      const files = grouped[cat]
      if (files && files.length) out[cat] = buildTree(files)
    }
    return out
  }, [grouped])

  const lib = health?.library
  const lastScanLabel = lib?.last_scan_at ? formatRelative(lib.last_scan_at) : 'never'

  return (
    <div className="library">
      <header className="library__header">
        <div>
          <h1>Library</h1>
          <p className="muted">
            What's currently on the NAS. Updated every hour and after every successful add.
          </p>
        </div>
        <div className="library__actions">
          <button
            className="library__rescan"
            onClick={() => rescan.mutate()}
            disabled={rescan.isPending}
          >
            {rescan.isPending ? 'Queueing…' : 'Rescan now'}
          </button>
          <span className="library__last-scan">
            Last scan: <strong>{lastScanLabel}</strong>
          </span>
        </div>
      </header>

      <LibraryStateBadge />

      {error && <p className="error">{error.message}</p>}
      {isLoading && <p className="muted">Loading library index…</p>}

      {data && data.files.length === 0 && (
        <div className="card">
          <p className="muted">
            Nothing indexed yet. Either the NAS paths are empty, the verifier
            says they're missing, or the first scan hasn't completed.
          </p>
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const root = trees[cat]
        if (!root) return null
        return (
          <section key={cat} className="library__section">
            <h2 className="library__section-title">
              {CATEGORY_LABEL[cat]}
              <span className="library__section-count">{root.fileCount}</span>
              <span className="library__section-size">{formatBytes(root.totalSize)}</span>
            </h2>
            <div className="library__tree">
              {root.children.map(child => (
                <TreeBranch
                  key={child.kind === 'dir' ? `d:${child.name}` : child.key}
                  node={child}
                  depth={0}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
