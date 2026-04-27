import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'

/**
 * @returns A mutation that runs an ad-hoc torrent search. Trigger by calling
 *   `mutate(query)` or `mutateAsync(query)`. The result is held on the mutation
 *   itself (no global cache) — search responses are user-driven and shouldn't
 *   stick around in the query cache.
 */
export function useSearchMutation() {
  return useMutation({
    mutationFn: (query: string) => api.search(query),
  })
}

/**
 * @returns A mutation that adds a torrent to the daemon by magnet URI.
 */
export function useAddTorrentMutation() {
  return useMutation({
    mutationFn: (magnet: string) => api.addTorrent(magnet),
  })
}
