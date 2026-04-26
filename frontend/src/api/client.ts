const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json()
}

export interface Health {
  status: string
  started_at: string
  uptime_seconds: number
}

export interface Version {
  version: string
  git_sha: string
  build_timestamp: string
  qt_version: string
}

export interface Settings {
  download_dir: string
  resume_dir: string
  listen_port: number
  control_bind_address: string
  control_listen_port: number
}

export interface SettingsUpdateResult {
  applied: string[]
  requires_restart: string[]
  errors: string[]
}

export const api = {
  health: () => request<Health>('/health'),
  version: () => request<Version>('/version'),
  getSettings: () => request<Settings>('/settings'),
  putSettings: (payload: Partial<Settings>) =>
    request<SettingsUpdateResult>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
}
