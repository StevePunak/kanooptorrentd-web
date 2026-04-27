import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export const torrentsQueryKey = ['torrents'] as const
export const sessionStatsQueryKey = ['session', 'stats'] as const

/** Polls the active torrents list every 2s while the page is open. */
export function useTorrents() {
  return useQuery({
    queryKey: torrentsQueryKey,
    queryFn: api.listTorrents,
    refetchInterval: 2_000,
    staleTime: 0,
  })
}

/** Polls aggregate session stats every 2s. */
export function useSessionStats() {
  return useQuery({
    queryKey: sessionStatsQueryKey,
    queryFn: api.sessionStats,
    refetchInterval: 2_000,
    staleTime: 0,
  })
}

function useTorrentMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: torrentsQueryKey })
      qc.invalidateQueries({ queryKey: sessionStatsQueryKey })
    },
  })
}

export function usePauseTorrent() {
  return useTorrentMutation((infoHash: string) => api.pauseTorrent(infoHash))
}

export function useResumeTorrent() {
  return useTorrentMutation((infoHash: string) => api.resumeTorrent(infoHash))
}

export function useRemoveTorrent() {
  return useTorrentMutation(
    ({ infoHash, deleteFiles }: { infoHash: string; deleteFiles: boolean }) =>
      api.removeTorrent(infoHash, deleteFiles),
  )
}
