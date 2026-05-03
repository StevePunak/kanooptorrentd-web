import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type LibraryCategory } from '../api/client'
import { torrentsQueryKey } from './useTorrents'

export interface AddTorrentInput {
  magnet: string
  category?: LibraryCategory
}

export interface SearchInput {
  query: string
  category?: string
}

/**
 * @returns A mutation that runs an ad-hoc torrent search. Trigger by calling
 *   `mutate({ query, category })`. Category is optional; omit or pass 'any'
 *   to search across every category. The result is held on the mutation
 *   itself (no global cache) — search responses are user-driven and shouldn't
 *   stick around in the query cache.
 */
export function useSearchMutation() {
  return useMutation({
    mutationFn: ({ query, category }: SearchInput) => api.search(query, category),
  })
}

/**
 * @returns A mutation that adds a torrent to the daemon by magnet URI.
 *   Invalidates the torrents list on success so the new torrent shows up
 *   on the Torrents page without waiting for the next poll.
 */
export function useAddTorrentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ magnet, category }: AddTorrentInput) => api.addTorrent(magnet, category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: torrentsQueryKey })
    },
  })
}
