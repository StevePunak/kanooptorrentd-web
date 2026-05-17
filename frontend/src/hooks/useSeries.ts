import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { MonitoredSeriesCreate } from '../api/client'

export const seriesQueryKey = ['series'] as const

export function useSeries() {
  return useQuery({
    queryKey: seriesQueryKey,
    queryFn: api.listSeries,
    staleTime: 10_000,
    // Conditional polling: while any series still has last_checked_at empty
    // (freshly added, awaiting the watcher's first 60s tick), refetch every
    // 5s so the UI picks up the timestamp as soon as the daemon writes it.
    // Once every row has a checked-at, polling stops automatically.
    refetchInterval: query => {
      const data = query.state.data
      if (!data) return false
      return data.series.some(s => !s.last_checked_at) ? 5_000 : false
    },
  })
}

export function useCreateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MonitoredSeriesCreate) => api.createSeries(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesQueryKey }),
  })
}

export function useUpdateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: number; payload: Partial<MonitoredSeriesCreate> }) =>
      api.updateSeries(args.id, args.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesQueryKey }),
  })
}

export function useDeleteSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteSeries(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesQueryKey }),
  })
}

export function useRunSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.runSeries(id),
    // Run is async on the daemon — refetch the list shortly so last_checked_at
    // and (potentially) last_found_at update without a manual refresh.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: seriesQueryKey })
      setTimeout(() => qc.invalidateQueries({ queryKey: seriesQueryKey }), 5_000)
    },
  })
}
