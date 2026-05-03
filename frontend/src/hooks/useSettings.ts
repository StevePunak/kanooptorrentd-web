import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Settings } from '../api/client'

export const settingsQueryKey = ['settings'] as const

export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: api.getSettings,
    staleTime: 60_000,
  })
}

export function useSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Settings>) => api.putSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })
}
