import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export const healthQueryKey = ['health'] as const

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: api.health,
    refetchInterval: 5_000,
    staleTime: 0,
  })
}
