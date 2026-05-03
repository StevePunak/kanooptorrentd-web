import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export const versionQueryKey = ['version'] as const

export function useVersion() {
  return useQuery({
    queryKey: versionQueryKey,
    queryFn: api.version,
    staleTime: Infinity,  // version doesn't change without a daemon restart
  })
}
