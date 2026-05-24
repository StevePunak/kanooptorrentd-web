# Recent Show Card — Episode Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each card in the Dashboard's "Recent Shows" grid open a modal listing that show's new episodes (S<season>E<episode> + relative date) for the same 30-day window the card summarizes.

**Architecture:** Pure frontend change. New component (`RecentEpisodesModal`) + new hook (`useLibraryRecentEpisodes`) that filters the already-cached `useLibraryFiles('tv')` query. Card becomes interactive (onClick + keyboard). Dashboard holds `activeShow` state and conditionally renders the modal. No daemon, FastAPI, or schema changes.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, `@tanstack/react-query` v5. No test runner installed — verification is manual via `npm run dev` (this matches the project's current convention; setting up vitest is explicitly out of scope per the spec).

**Spec:** `docs/superpowers/specs/2026-05-23-recent-show-card-detail-modal-design.md`

**Working directory for all tasks:** `/home/spunak/src/punak/kanooptorrentd-web/`

---

## Task 1: Add the `useLibraryRecentEpisodes` hook

**Files:**
- Modify: `frontend/src/hooks/useLibrary.ts`

Filters the cached `useLibraryFiles('tv')` query down to one show's new episodes within the requested window. No new network request — rides on the existing 30s-stale react-query cache.

- [ ] **Step 1: Open `frontend/src/hooks/useLibrary.ts` and inspect imports**

The file currently imports from `@tanstack/react-query`, `../api/client`, and `./useHealth`. We need to add `useMemo` from React and the `LibraryFile` type from the client.

- [ ] **Step 2: Update the top-of-file imports**

Change the existing imports to also pull `useMemo` and `LibraryFile`. The first three import lines become:

```ts
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { LibraryCategory, LibraryFile } from '../api/client'
import { healthQueryKey } from './useHealth'
```

(Only `useMemo` and `LibraryFile` are additions; everything else was already there.)

- [ ] **Step 3: Append the new hook at the end of the file**

Add this function after `useLibraryRecentShows`:

```ts
/**
 * Per-show derived view over the cached `useLibraryFiles('tv')` query.
 * Filters to TV files whose rel_path starts with `<title>/` and whose mtime
 * is within the last `days`, sorted by mtime descending. Rides on the
 * existing react-query cache — no additional fetch.
 */
export function useLibraryRecentEpisodes(title: string, days: number) {
  const all = useLibraryFiles('tv')
  const episodes = useMemo<LibraryFile[]>(() => {
    if (!all.data) return []
    const cutoff = Date.now() - days * 86_400_000
    const prefix = `${title}/`
    return all.data.files
      .filter(f => f.rel_path.startsWith(prefix))
      .filter(f => {
        const t = new Date(f.mtime).getTime()
        return Number.isFinite(t) && t >= cutoff
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
  }, [all.data, title, days])

  return {
    isLoading: all.isLoading,
    error: all.error,
    episodes,
  }
}
```

- [ ] **Step 4: Type-check**

Run: `cd /home/spunak/src/punak/kanooptorrentd-web/frontend && npx tsc -b --noEmit`

Expected: exits 0 with no output.

- [ ] **Step 5: Commit**

```bash
cd /home/spunak/src/punak/kanooptorrentd-web
git add frontend/src/hooks/useLibrary.ts
git commit -m "$(cat <<'EOF'
Add useLibraryRecentEpisodes hook

Derives a per-show episode list from the cached useLibraryFiles('tv')
query — no extra fetch. Will back the Recent Show detail modal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create the `RecentEpisodesModal` component and its CSS

**Files:**
- Create: `frontend/src/components/RecentEpisodesModal.tsx`
- Create: `frontend/src/components/RecentEpisodesModal.css`

Self-contained modal: backdrop, dialog with header/body/footer, keyboard (Esc closes) and focus (auto-focus close button, restore on unmount) management. Portals to `document.body` so it isn't clipped by the dashboard grid.

- [ ] **Step 1: Verify the `components/` directory exists**

Run: `ls /home/spunak/src/punak/kanooptorrentd-web/frontend/src/components/`

Expected: lists existing files (e.g. `common/ProxyStateBadge.tsx`). The directory exists; we're adding to it.

- [ ] **Step 2: Create `frontend/src/components/RecentEpisodesModal.tsx` with this content**

```tsx
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

// Mirrors formatRelative in Dashboard.tsx. Kept local to avoid a one-call
// shared-util lift; tighten later if a third caller appears.
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

  // Save the trigger and move focus into the modal; restore on unmount.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => {
      previouslyFocusedRef.current?.focus()
    }
  }, [])

  // Escape closes.
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
```

- [ ] **Step 3: Create `frontend/src/components/RecentEpisodesModal.css` with this content**

```css
.recent-episodes-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-3);
}

.recent-episodes-modal {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.recent-episodes-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.recent-episodes-modal__heading { min-width: 0; }

.recent-episodes-modal__title {
  margin: 0;
  font-family: var(--font-mono);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.recent-episodes-modal__subtitle {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.recent-episodes-modal__close-x {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: var(--space-1);
  line-height: 1;
}
.recent-episodes-modal__close-x:hover { color: var(--color-text); }
.recent-episodes-modal__close-x:focus-visible {
  outline: 1px solid var(--color-primary-hi);
  outline-offset: 2px;
}

.recent-episodes-modal__body {
  padding: var(--space-3);
  overflow-y: auto;
  flex: 1 1 auto;
}

.recent-episodes-modal__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.recent-episodes-modal__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
}
.recent-episodes-modal__row:last-child { border-bottom: none; }

.recent-episodes-modal__label {
  color: var(--color-text);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.recent-episodes-modal__date {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.recent-episodes-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 4: Type-check**

Run: `cd /home/spunak/src/punak/kanooptorrentd-web/frontend && npx tsc -b --noEmit`

Expected: exits 0 with no output.

- [ ] **Step 5: Commit**

```bash
cd /home/spunak/src/punak/kanooptorrentd-web
git add frontend/src/components/RecentEpisodesModal.tsx frontend/src/components/RecentEpisodesModal.css
git commit -m "$(cat <<'EOF'
Add RecentEpisodesModal component

Portal-rendered modal that lists a show's new episodes (SxxExx parsed
from rel_path) with their added-to-library relative dates. Backdrop and
Escape close; auto-focuses the close button and restores focus to the
trigger on unmount.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Make `RecentShowCard` clickable

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (RecentShowCard component, lines ~47-62)
- Modify: `frontend/src/pages/Dashboard.css` (append hover rules at end of file)

Card becomes a `role="button"` element with onClick + Enter/Space keyboard handling. CSS adds a pointer cursor and a `:hover` border lightness lift (no transform/scale to avoid grid jitter).

- [ ] **Step 1: Update `RecentShowCard` to accept and use an `onClick` prop**

In `frontend/src/pages/Dashboard.tsx`, replace the existing `RecentShowCard` function (currently around lines 47-62) with this:

```tsx
function RecentShowCard({
  show,
  onClick,
}: {
  show: LibraryRecentShow
  onClick: () => void
}) {
  const stray = looksLikeRelease(show.title)
  return (
    <div
      className={`recent-show${stray ? ' recent-show--stray' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      title={
        stray
          ? 'Looks like a release-name folder — may be unorganized'
          : undefined
      }
    >
      <div className="recent-show__title">{show.title}</div>
      <div className="recent-show__meta">
        <span className="recent-show__count">
          {show.new_episode_count} new
        </span>
        {show.latest_mtime && (
          <span className="recent-show__last">
            {formatRelative(show.latest_mtime)}
          </span>
        )}
      </div>
    </div>
  )
}
```

(Same JSX shape as before; only difference is the new `role`/`tabIndex`/`onClick`/`onKeyDown` attributes and the prop.)

- [ ] **Step 2: Update the caller inside the Dashboard `recent.data.shows.map(...)` block**

In the same file, around line 116 the current line is:

```tsx
<RecentShowCard key={s.title} show={s} />
```

Change it to:

```tsx
<RecentShowCard key={s.title} show={s} onClick={() => {}} />
```

The empty handler is temporary scaffolding — Task 4 replaces it with the real one. This keeps the file compiling between tasks.

- [ ] **Step 3: Append hover/cursor rules to `frontend/src/pages/Dashboard.css`**

Add these rules at the end of the file (after the existing `.recent-show__last` block):

```css
.recent-show {
  cursor: pointer;
  transition: border-color 0.12s ease;
}
.recent-show:hover {
  border-color: var(--color-primary-hi);
}
.recent-show:focus-visible {
  outline: 1px solid var(--color-primary-hi);
  outline-offset: 2px;
}
.recent-show--stray:hover {
  border-color: var(--color-warning, #b8732e);
  filter: brightness(1.1);
}
```

(The `:hover` for the stray variant keeps the warning color but brightens it slightly, so it's still distinguishable as warning rather than primary.)

- [ ] **Step 4: Type-check**

Run: `cd /home/spunak/src/punak/kanooptorrentd-web/frontend && npx tsc -b --noEmit`

Expected: exits 0 with no output.

- [ ] **Step 5: Commit**

```bash
cd /home/spunak/src/punak/kanooptorrentd-web
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/Dashboard.css
git commit -m "$(cat <<'EOF'
Make RecentShowCard clickable

Card becomes role=button with Enter/Space keyboard handling and a
pointer-cursor hover lift on the border. onClick handler is plumbed
through as a prop; Dashboard wires it to the modal in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire the modal into the Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (top-of-file imports, `Dashboard` component body)

Dashboard now owns `activeShow: string | null`. Clicking a card sets it; rendering the modal is conditional on it being non-null; closing the modal clears it.

- [ ] **Step 1: Add the React `useState` import and the modal import**

Dashboard.tsx today does not import anything from `react` directly (it uses the JSX-transform and only imports custom hooks). Add these two lines at the very top of the file, above the existing `import { useHealth } from '../hooks/useHealth'` line:

```tsx
import { useState } from 'react'
import RecentEpisodesModal from '../components/RecentEpisodesModal'
```

- [ ] **Step 2: Add the `activeShow` state in the `Dashboard` component body**

Inside the `Dashboard` function (just below the existing `const recent = useLibraryRecentShows(RECENT_DAYS, RECENT_LIMIT)` line), add:

```tsx
  const [activeShow, setActiveShow] = useState<string | null>(null)
```

- [ ] **Step 3: Replace the empty onClick scaffold with the real handler**

In the `recent.data.shows.map(...)` block, change the temporary line from Task 3:

```tsx
<RecentShowCard key={s.title} show={s} onClick={() => {}} />
```

to:

```tsx
<RecentShowCard
  key={s.title}
  show={s}
  onClick={() => setActiveShow(s.title)}
/>
```

- [ ] **Step 4: Conditionally render the modal at the end of the Dashboard JSX**

Inside the top-level `<div className="dashboard">` returned by `Dashboard`, after the closing `</section>` of the recent-shows section (around line 120) and before the closing `</div>`, add:

```tsx
      {activeShow && (
        <RecentEpisodesModal
          showTitle={activeShow}
          days={RECENT_DAYS}
          onClose={() => setActiveShow(null)}
        />
      )}
```

The final structure of the Dashboard return value should be:

```tsx
return (
  <div className="dashboard">
    <div className="dashboard__hero">...</div>
    <section className="dashboard__status">...</section>
    <section className="card recent-shows">...</section>
    {activeShow && (
      <RecentEpisodesModal
        showTitle={activeShow}
        days={RECENT_DAYS}
        onClose={() => setActiveShow(null)}
      />
    )}
  </div>
)
```

- [ ] **Step 5: Type-check**

Run: `cd /home/spunak/src/punak/kanooptorrentd-web/frontend && npx tsc -b --noEmit`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
cd /home/spunak/src/punak/kanooptorrentd-web
git add frontend/src/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Wire RecentEpisodesModal into Dashboard

Dashboard holds activeShow state; clicking a recent-show card opens
the modal for that show, Escape/backdrop/Close button clear it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual verification gate

**Files:** none modified — verification only.

Project has no test runner; verification matches the spec's stated approach. Each check below has a clear pass criterion. Do not declare the feature done if any of these fail — instead, file a follow-up under "Issues found" at the bottom of this plan and decide whether to fix here or punt.

- [ ] **Step 1: Start the dev server**

Run: `cd /home/spunak/src/punak/kanooptorrentd-web/frontend && npm run dev`

Expected: Vite starts on its usual port and reports `ready in <ms> ms`. Leave it running for the rest of this task.

- [ ] **Step 2: Open the Dashboard in a browser**

Navigate to the dev server URL (default http://localhost:5173 unless overridden) and confirm the "Recent Shows" section renders cards as before.

Expected: cards display with title, "N new" count, and relative date — visually identical to before this feature.

- [ ] **Step 3: Click a card and verify modal contents**

Click one show card (pick one with `new_episode_count >= 2` to make the list visibly non-trivial — e.g. Chicago PD or FBI from the screenshot reference).

Expected:
- Modal opens centered on the viewport.
- Header shows the show title and `N new in last 30 days` where N matches the card's count.
- Body shows N rows, each `SxxExx · Xd ago` (or basename · Xd ago for unparsable filenames).
- Rows are sorted newest first.

Cross-check the count with: `ssh stilgar "curl -s 'http://127.0.0.1:8901/admin/library/files?category=tv' | python3 -c \"import json,sys; print(sum(1 for f in json.load(sys.stdin)['files'] if f['rel_path'].startswith('Chicago PD/')))\""`

Expected: that count equals or exceeds the modal's row count (the modal additionally filters by 30-day window).

- [ ] **Step 4: Verify keyboard interactions**

Close the modal if open. Tab through the page until a recent-show card has focus (visible focus ring). Press Enter.

Expected: modal opens with the close button focused.

Press Tab repeatedly.

Expected: focus cycles among the modal's interactive elements (close-X button, Close button). Tab does not escape the modal.

Press Escape.

Expected: modal closes and focus returns to the card that triggered it.

Repeat with Space instead of Enter on the card.

Expected: identical behavior (modal opens).

- [ ] **Step 5: Verify backdrop click closes the modal**

Click a card, then click anywhere on the dimmed area outside the modal panel.

Expected: modal closes. Clicking inside the panel (on the title or list area, but not a button) does NOT close it.

- [ ] **Step 6: Mobile viewport sanity check**

In Chrome devtools, toggle device toolbar and select Samsung S25 Ultra preset (or any narrow viewport ~360px CSS width). Click a card.

Expected:
- Modal occupies most of the viewport width (max-width caps it at 480px which is well above 360, so it stretches to viewport minus padding).
- Header, list, and Close button are all readable and reachable.
- List scrolls if there are enough episodes to overflow.

- [ ] **Step 7: Final summary**

If all of the above pass, the feature is done. If anything failed, document the failure in this section below before declaring done:

**Issues found:**
- (none / list any failures here)

---

## Notes for the implementer

- **The parallel agent.** Another agent works on `kanooptorrentd-web` (per the project memory note). Before starting, run `git pull --ff-only` in the web repo to be on the latest. Each commit in this plan is small and surgical, so rebasing on top of their work shouldn't be painful, but you may want to do a quick `git fetch && git log HEAD..origin/main --oneline` before each task as a sanity check.
- **CSS variables.** The plan uses `var(--color-surface-2)`, `var(--color-border)`, `var(--color-primary-hi)`, `var(--color-text)`, `var(--color-text-muted)`, `var(--color-warning, #b8732e)`, `var(--font-mono)`, `var(--space-1)`, `var(--space-2)`, `var(--space-3)`, `var(--radius)`. All are already in use elsewhere in `Dashboard.css` — they're defined in the app's theme/root CSS and don't need to be added.
- **No commits go to remote in this plan.** The user pushes to `origin` themselves (per project convention). Local commits only.
- **If the type-check fails between tasks**, do not commit. Inspect the error and either fix it in the same task or surface to the user. Don't push past a broken `tsc`.
