# KanoopTorrentD Portal — Architecture

Layout and structural conventions for the FastAPI + React portal. Source of feature truth is `../kanooptorrentd-mains/KanoopTorrentD/TODO.md`; this document defines where each feature lands.

## Top-level routes

| Route        | Tab          | Purpose |
|--------------|--------------|---------|
| `/`          | Dashboard    | Daemon status, kiosk-gate state (proxy + library), live global stats, recent completed downloads. Folds the original "Status" + "Recent downloads on landing" TODO items |
| `/torrents`  | Torrents     | Active torrents list, detail drawer, add/remove/pause/resume/recheck/move |
| `/search`    | Search       | Ad-hoc search across configured sources (RSS, tracker APIs); send results to `/torrents`. Shares the backend search-adapter layer with the series watcher |
| `/library`   | Library      | NAS paths, per-path mount/writable/free-space, scan trigger + history |
| `/series`    | Series       | TV episode watcher — list, add/edit, run-now, per-series history |
| `/settings`  | Settings     | Sub-tabs (see below). Deep-linkable: `/settings/system`, `/settings/torrent`, etc. |
| `/about`     | (footer)     | Version, git SHA, build timestamp, Qt version |

## Settings sub-tabs

One `/settings` route with a tabbed sub-shell. They diverge in audience and pace of change, so a single page would bloat fast. Each sub-tab is one component; they share `<SettingsLayout>`.

- `/settings/system` — control bind/port, auth token, TLS, log level, log rotation
- `/settings/torrent` — listen port, rate limits, DHT/PEX/LSD/uTP, encryption
- `/settings/proxy` — SOCKS5 config + verification probe + gate state
- `/settings/library` — TV/Movies/Music paths + NAS layout templates

The settings PUT endpoint remains a single partial-update payload; the UI slices which fields render on which tab.

## Frontend folder structure

```
frontend/src/
  api/                  # one file per backend resource
    client.ts           # base fetcher, error handling
    torrents.ts
    search.ts
    library.ts
    series.ts
    settings.ts
    stats.ts
    health.ts
    version.ts
  hooks/                # TanStack Query wrappers per resource
    useTorrents.ts
    useSearch.ts
    useHealth.ts
    ...
  components/
    layout/             # Layout, TopNav, MobileNav, StatusBanner
    common/             # StatCard, RateGauge, ProgressBar, ByteSize, Duration
    torrents/           # TorrentRow, TorrentDetail, AddTorrentDialog
    search/             # SearchResultRow, SourceFilter
    settings/           # SettingsSection, ToggleField, NumberField, PathField
    library/            # PathStatusCard
    series/             # SeriesRow, SeriesEditor
  pages/
    Dashboard/
    Torrents/
    Search/
    Library/
    Series/
    Settings/
      index.tsx         # redirect to /settings/system + sub-tab nav
      System.tsx
      Torrent.tsx
      Proxy.tsx
      Library.tsx
    About.tsx
  types/                # shared TS interfaces (currently inlined in client.ts)
  utils/                # formatters (bytes, rates, durations)
  styles/               # design tokens
```

## Backend folder structure

The current `routers/` + `services/` + `models/` split is correct; it just grows.

```
backend/app/
  routers/
    health.py           # exists
    version.py          # exists
    settings.py         # exists; grows with new keys
    torrents.py         # NEW — CRUD + actions
    search.py           # NEW — query across adapters, return unified results
    library.py          # NEW — status, rescan
    series.py           # NEW — CRUD + run + history
    stats.py            # NEW — global stats; later: SSE /events
  services/
    daemon_client.py    # base httpx wrapper; resource helpers added here
    search/             # adapter layer shared by routers/search.py and series scheduler
      __init__.py       # registry
      rss.py
      <tracker>.py
  models/
    schemas/            # split per resource once schemas.py exceeds ~150 lines
      torrents.py
      search.py
      ...
```

`services/search/` is the key reuse point: the Search page and the series watcher's scheduled jobs both go through the same adapter registry.

## Architectural decisions

1. **TanStack Query (React Query) before more pages land.** Polling health every 5s is fine in `useEffect`; doing the same for torrents (1–2s), stats (1s), library status, search results turns `App.tsx` into a polling zoo. TanStack Query gives polling, caching, dedupe, mutation invalidation, stale-while-revalidate. Adding it later means rewriting every page.

2. **Plan the live-update seam, implement polling.** Torrent stats at 1Hz over JSON polling is wasteful. Eventually want SSE (`GET /api/events` on FastAPI, fanned out from a single daemon poller). Build the hooks (`useTorrents`, `useStats`) so the implementation can swap from polling to SSE without touching component code. Don't build the SSE pipe yet; just don't paint into a corner.

3. **Mobile-friendly from the start.** Top nav collapses to hamburger under ~640px in `<Layout>`. Torrents/Search use a table on desktop, card list on mobile (same row component, two layouts via breakpoint). Settings sub-tabs become a vertical accordion on mobile.

4. **CSS approach.** Plain CSS with custom-property tokens. Tailwind also acceptable. Avoid CSS-in-JS — no upside at this size. Codify spacing/colors as tokens in `styles/tokens.css` so visual polish is one file.

## Migration path from current state

Smallest sequence that doesn't break anything:

1. Introduce `<Layout>` + extract `DaemonStatusBanner`; routes unchanged
2. Add TanStack Query; migrate the 3 existing pages (each <50 lines, low risk)
3. Split `client.ts` per resource; add `types/`
4. Restructure `pages/Settings.tsx` into sub-tabs (still one route, no behavior change)
5. Add `/torrents` and `/search` once daemon endpoints exist
6. New domains follow the established pattern

## Conventions

- One backend router per resource; routers stay thin and delegate to services
- One frontend `api/<resource>.ts` per backend resource; one `hooks/use<Resource>.ts` per api file
- Page components import only hooks + `components/`, never the raw fetcher
- Shared formatters (bytes/rate/duration) live in `utils/`, never inlined
- Deep-linkable URLs for any view a user might bookmark — sub-tabs included
