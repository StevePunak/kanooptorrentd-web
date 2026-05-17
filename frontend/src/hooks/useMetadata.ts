import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

/**
 * Hook for the TMDB title autocomplete. Debounces the input so we don't
 * fire a request on every keystroke (TMDB's search endpoint is rate-limited
 * and the proxy chain through FastAPI + daemon adds latency anyway). The
 * shortest queries (< 2 chars) don't fetch at all — the result set is
 * useless and TMDB returns junk anyway.
 *
 * @param query   Raw input value. Update unconditionally on every keystroke;
 *                the hook handles debouncing internally.
 * @param enabled Caller-controlled gate, e.g. only fetch while the picker
 *                dropdown is open or the input is focused.
 */
export function useMetadataSearch(query: string, enabled: boolean) {
  // 300ms debounce — feels responsive but coalesces fast typing into one
  // request. Anything tighter floods the daemon during normal typing speed.
  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const trimmed = debounced.trim()
  return useQuery({
    queryKey: ['metadata-search', trimmed],
    queryFn: () => api.metadataSearch(trimmed),
    enabled: enabled && trimmed.length >= 2,
    // Results don't change minute-to-minute; cache aggressively to keep
    // re-queries (re-focus, dropdown toggle) cheap.
    staleTime: 5 * 60_000,
  })
}

/**
 * Fetch the full show detail for a TMDB id. Used when the user picks a
 * suggestion from the search dropdown — we need first_air_date, network
 * name, external_ids.imdb_id which aren't in the search response.
 *
 * Caller passes `enabled` false until they actually want to fetch (typically
 * triggered by selection).
 */
export function useMetadataShow(tvId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['metadata-show', tvId],
    queryFn: () => api.metadataShow(tvId),
    enabled: enabled && tvId > 0,
    staleTime: 24 * 60 * 60_000,  // a day — show details are basically immutable
  })
}

/** TMDB movie autocomplete — same debounce + min-length gate as the TV
 *  search hook. Separate query key from the TV one so React Query keeps
 *  parallel caches keyed by (kind, query). */
export function useMetadataMovieSearch(query: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const trimmed = debounced.trim()
  return useQuery({
    queryKey: ['metadata-movie-search', trimmed],
    queryFn: () => api.metadataMovieSearch(trimmed),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 5 * 60_000,
  })
}

/** Full movie detail for a TMDB id. Currently used after a pick to surface
 *  imdb_id + runtime, neither of which are in the search response. */
export function useMetadataMovie(movieId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['metadata-movie', movieId],
    queryFn: () => api.metadataMovie(movieId),
    enabled: enabled && movieId > 0,
    staleTime: 24 * 60 * 60_000,
  })
}
