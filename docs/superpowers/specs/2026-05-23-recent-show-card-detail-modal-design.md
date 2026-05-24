# Recent Show Card — episode detail modal

**Date:** 2026-05-23
**Status:** Approved, ready for implementation plan
**Scope:** frontend-only change in `kanooptorrentd-web`. No daemon, FastAPI, or schema changes.

## Goal

The Dashboard's "Recent Shows" section displays a grid of TV-show cards summarizing recent activity (`<title> — N new — <relative mtime>`). Today the cards are non-interactive `<div>`s. Make them clickable: clicking opens a modal showing the per-episode list for that show within the same 30-day window, with each episode's added-to-library date.

The primary detail is **date** — when each new episode landed in the library — so the modal's content prioritizes that.

## Non-goals

- No backend / API changes (the existing `/admin/library/files?category=tv` endpoint already returns everything needed).
- No TMDB integration in this iteration (no air dates, no posters, no episode titles).
- No watch-status, no per-episode actions (delete, rescan, etc.).
- No navigation to a dedicated show page — modal only.

## Architecture

Pure frontend change. Single new component, one new hook, light DOM additions to an existing component. Data sourced from a cached query the app already makes elsewhere.

```
Dashboard.tsx
  └── RecentShowCard (existing, now clickable)
        │
        │  click ─→ Dashboard sets `activeShow: string | null`
        ▼
  RecentEpisodesModal (new)
        │
        └── useLibraryRecentEpisodes(title, days) (new hook)
              │
              └── wraps useLibraryFiles('tv') (existing cached query)
                    filters: rel_path starts with `<title>/` && mtime within days
                    sorts:   mtime desc
```

## Components

### `RecentShowCard` (existing — extend)

Add interactivity:

- `onClick` handler invoked with the show title.
- `role="button"`, `tabIndex={0}`.
- `onKeyDown` handler firing `onClick` on `Enter` and `Space` (preventDefault on Space to avoid page scroll).
- CSS: `cursor: pointer` and a `:hover` rule on `.recent-show` that lifts the border-color one shade (matching whatever hover precedent already exists in `Dashboard.css` if any — otherwise +10% lightness on `border-color`). No transform/scale to avoid grid jitter.
- The "stray" (release-name) variant remains clickable — clicking still opens the modal.

### `RecentEpisodesModal` (new)

Props: `{ showTitle: string; days: number; onClose: () => void }`.

Structure:

```
┌─────────────────────────────────────────────────┐
│  Chicago PD                              [✕]   │
│  14 new in last 30 days                         │
├─────────────────────────────────────────────────┤
│  S03E12 · 8d ago                                │
│  S03E11 · 9d ago                                │
│  S03E10 · 10d ago                               │
│  ...                                            │
├─────────────────────────────────────────────────┤
│                                  [  Close  ]    │
└─────────────────────────────────────────────────┘
```

Behavior:

- Renders into a portal at the document body (avoid grid clipping).
- Backdrop click closes; Escape key closes.
- Focus moves to the modal on open and is trapped within it (Tab cycles between Close button and the close `✕`).
- On close, focus returns to the card that triggered it (the `RecentShowCard` retains a ref or the trigger element is restored via `aria-modal`/`document.activeElement` save-and-restore).
- Body content is scrollable when the list overflows the viewport.

### `useLibraryRecentEpisodes(title, days)` (new hook in `useLibrary.ts`)

```ts
export function useLibraryRecentEpisodes(title: string, days: number) {
  const all = useLibraryFiles('tv')
  return useMemo(() => {
    const cutoff = Date.now() - days * 86_400_000
    const rows = (all.data?.files ?? [])
      .filter(f => f.rel_path.startsWith(`${title}/`))
      .filter(f => new Date(f.mtime).getTime() >= cutoff)
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
    return { ...all, episodes: rows }
  }, [all.data, title, days])
}
```

The hook returns `{ isLoading, error, episodes }`. It rides on whatever cache policy `useLibraryFiles` already has — no separate fetch.

## Per-episode display

For each row:

- Left: episode identifier. Parse `rel_path` against `/S(\d{1,2})E(\d{1,3})/i`; if matched, render `S<season>E<episode>` zero-padded to 2 digits each (e.g. `S03E12`, `S01E01`). If the match is not found, fall back to the basename (`rel_path.split('/').pop()`) with the extension stripped.
- Right: relative mtime via the existing `formatRelative` helper in `Dashboard.tsx` (lift it out into a shared util if used in more than one place).
- Tooltip on the right side: the absolute ISO timestamp from `mtime` (so hovering reveals the exact time).

## Data flow

1. `Dashboard.tsx` holds `const [activeShow, setActiveShow] = useState<string | null>(null)`.
2. Each `RecentShowCard` receives `onClick={() => setActiveShow(show.title)}`.
3. When `activeShow !== null`, `<RecentEpisodesModal showTitle={activeShow} days={RECENT_DAYS} onClose={() => setActiveShow(null)} />` is rendered.
4. The modal calls `useLibraryRecentEpisodes(showTitle, days)` which returns the filtered episode list from the cached `/library/files?category=tv` response.

## Edge cases

| Case | Behavior |
|---|---|
| Modal opens but the cached `library files` query is still loading | Show "Loading…" in the modal body. |
| Hook error (network / cache miss followed by API error) | Show error message in modal body; Close button still works. |
| Card claimed N new but the filter returns zero rows | Show "No matching episode files." This shouldn't happen in practice — the aggregate and the per-file list come from the same DB rows — but guards against drift. |
| User clicks a card while modal for another show is open | Switch the modal contents to the new show; do not close-and-reopen (preserves the trapped focus and avoids transition flicker). |
| The 30-day window contains an episode whose mtime is in the future (clock skew) | Include it (no upper-bound filter). |

## Testing

This project does not currently have a vitest/jest setup. Verification is manual:

1. `cd kanooptorrentd-web/frontend && npm run dev`, open the dashboard.
2. Click each card in the Recent Shows grid; confirm the modal shows a list whose length matches the card's "N new" count for at least one show (cross-check with `curl /admin/library/files?category=tv | jq ...`).
3. Keyboard test: Tab to a card, press Enter — modal opens. Press Escape — modal closes, focus returns to the card. Tab cycles between modal controls only.
4. Backdrop click closes the modal.
5. Mobile sanity-check via Chrome devtools responsive mode (S25 Ultra preset, 1440×3120 → CSS 360×780): modal occupies most of the viewport, content is readable, scrolling works.

## Out of scope (explicitly punted, candidates for follow-up)

- Migrating the data source to a server-filtered endpoint `GET /admin/library/shows/<title>/recent-episodes?days=N` once the TV library is big enough that fetching all rows on the dashboard hurts.
- Showing TMDB-sourced air dates and episode titles next to the in-library mtime.
- Episode-level actions: rescan one file, delete, mark watched, etc.
- A dedicated show-detail page reachable from the modal.
