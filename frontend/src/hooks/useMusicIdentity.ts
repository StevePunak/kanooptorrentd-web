import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/** GET /api/torrents/{hash}/music-identity. Same swallow-the-404 contract
 *  as the movie identity hook — "no music identity set" is the common
 *  state while a torrent is downloading. */
export function useMusicIdentity(infoHash: string, enabled: boolean) {
  return useQuery({
    queryKey: ['music-identity', infoHash],
    queryFn: async () => {
      try {
        return await api.getMusicIdentity(infoHash)
      } catch (err) {
        const msg = (err as Error).message ?? ''
        if (msg.includes('no music identity')) return null
        throw err
      }
    },
    enabled: enabled && !!infoHash,
    staleTime: 60_000,
  })
}

export function useSetMusicIdentity(infoHash: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mbid: string) => api.setMusicIdentity(infoHash, mbid),
    onSuccess: data => {
      qc.setQueryData(['music-identity', infoHash], data)
    },
  })
}

/** GET /api/metadata/album/guess/{hash} — returns the daemon's
 *  best-guess {artist, album, year, mbid?} for the torrent. When files
 *  are on disk the daemon reads embedded tags (clean); otherwise it
 *  parses the release name. Used to seed the picker's inputs. */
export function useMetadataAlbumGuess(infoHash: string, enabled: boolean) {
  return useQuery({
    queryKey: ['metadata-album-guess', infoHash],
    queryFn: () => api.metadataAlbumGuess(infoHash),
    enabled: enabled && !!infoHash,
    staleTime: 5 * 60_000,
  })
}

/** MusicBrainz album autocomplete. Debounces (artist, album, year) so each
 *  keystroke isn't a request — MB's anonymous rate-limit is 1/sec so we
 *  err generous (500ms) here. */
export function useMetadataAlbumSearch(
  artist: string,
  album: string,
  year: number,
  enabled: boolean,
) {
  const [debounced, setDebounced] = useState({ artist, album, year })
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ artist, album, year }), 500)
    return () => clearTimeout(t)
  }, [artist, album, year])

  const a  = debounced.album.trim()
  const ar = debounced.artist.trim()
  return useQuery({
    queryKey: ['metadata-album-search', ar, a, debounced.year],
    queryFn: () => api.metadataAlbumSearch(ar, a, debounced.year),
    enabled: enabled && a.length >= 2,
    staleTime: 5 * 60_000,
  })
}
