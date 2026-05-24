import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { LibraryCategory, LibraryFile } from '../api/client'
import { healthQueryKey } from './useHealth'

export const libraryFilesQueryKey = (category?: LibraryCategory) =>
  ['library-files', category ?? 'all'] as const

export function useLibraryFiles(category?: LibraryCategory) {
  return useQuery({
    queryKey: libraryFilesQueryKey(category),
    queryFn: () => api.libraryFiles(category),
    staleTime: 30_000,
  })
}

export function useRescanLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.rescanLibrary(),
    onSuccess: () => {
      // The daemon's POST /admin/library/rescan returns immediately with
      // "rescan queued" — the actual scan runs on its own worker thread.
      // On a 40K-file NAS the full walk takes ~3 minutes; on smaller setups
      // it can be 10–30s. Invalidating only here would refetch the stale
      // pre-scan DB state and the UI would never reflect deletions/additions.
      // Stagger several invalidations across the typical scan-duration band
      // so the UI catches up regardless of where the scan actually finishes.
      const refresh = () => {
        qc.invalidateQueries({ queryKey: healthQueryKey })
        qc.invalidateQueries({ queryKey: ['library-files'] })
        qc.invalidateQueries({ queryKey: libraryShowsQueryKey })
      }
      refresh()
      const delays = [15_000, 60_000, 150_000, 300_000]
      for (const ms of delays) setTimeout(refresh, ms)
    },
  })
}

export const libraryShowsQueryKey = ['library-shows'] as const

export function useLibraryShows() {
  return useQuery({
    queryKey: libraryShowsQueryKey,
    queryFn: api.libraryShows,
    staleTime: 60_000,
  })
}

export const libraryRecentShowsQueryKey = (days: number, limit: number) =>
  ['library-recent-shows', days, limit] as const

export function useLibraryRecentShows(days = 7, limit = 10) {
  return useQuery({
    queryKey: libraryRecentShowsQueryKey(days, limit),
    queryFn: () => api.libraryRecentShows(days, limit),
    staleTime: 60_000,
  })
}

export const libraryRecentAlbumsQueryKey = (days: number, limit: number) =>
  ['library-recent-albums', days, limit] as const

export function useLibraryRecentAlbums(days = 30, limit = 12) {
  return useQuery({
    queryKey: libraryRecentAlbumsQueryKey(days, limit),
    queryFn: () => api.libraryRecentAlbums(days, limit),
    staleTime: 60_000,
  })
}

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
