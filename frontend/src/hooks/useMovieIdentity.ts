import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/** GET /api/torrents/{hash}/movie-identity. 404 (no identity bound yet) is
 *  the common path while a movie is downloading, so we swallow it here and
 *  return null rather than treating it as an error. */
export function useMovieIdentity(infoHash: string, enabled: boolean) {
  return useQuery({
    queryKey: ['movie-identity', infoHash],
    queryFn: async () => {
      try {
        return await api.getMovieIdentity(infoHash)
      } catch (err) {
        const msg = (err as Error).message ?? ''
        if (msg.includes('no movie identity')) return null
        throw err
      }
    },
    enabled: enabled && !!infoHash,
    staleTime: 60_000,
  })
}

export function useSetMovieIdentity(infoHash: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tmdbId: number) => api.setMovieIdentity(infoHash, tmdbId),
    onSuccess: data => {
      qc.setQueryData(['movie-identity', infoHash], data)
    },
  })
}
