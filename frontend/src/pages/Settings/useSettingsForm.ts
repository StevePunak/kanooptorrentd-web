import { useEffect, useState, type FormEvent } from 'react'
import { type Settings } from '../../api/client'
import { useSettings, useSettingsMutation } from '../../hooks/useSettings'

export function useSettingsForm<K extends keyof Settings>(keys: K[]) {
  const { data: full, error: queryError, isLoading } = useSettings()
  const mutation = useSettingsMutation()
  const [edits, setEdits] = useState<Pick<Settings, K> | null>(null)

  useEffect(() => {
    if (full && !edits) {
      const slice = {} as Pick<Settings, K>
      for (const k of keys) slice[k] = full[k]
      setEdits(slice)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full])

  const update = <T extends K>(key: T, value: Settings[T]) => {
    setEdits(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (edits) mutation.mutate(edits)
  }

  return {
    data: edits,
    isLoading,
    error: mutation.error?.message ?? queryError?.message ?? null,
    saving: mutation.isPending,
    restartFields: mutation.data?.requires_restart ?? [],
    update,
    onSubmit,
  }
}
