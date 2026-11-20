import type { AuthResponse } from '~/types/api'
import { getPublicRuntimeConfig } from './runtimeConfig'
import { appStorage, STORAGE_KEYS } from './storage'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
  requireProfile?: boolean
  profileIdOverride?: string | null
  _retried?: boolean
}

let refreshPromise: Promise<AuthResponse | null> | null = null

function getApiBaseUrl(): string {
  return getPublicRuntimeConfig().apiBaseUrl
}

async function tryRefreshToken(): Promise<AuthResponse | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = await appStorage.get(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) return null

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return null

      const data = (await res.json()) as AuthResponse
      await appStorage.set(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
      await appStorage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
      await appStorage.set(STORAGE_KEYS.USER, JSON.stringify(data.user))
      return data
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    skipAuth = false,
    requireProfile = false,
    profileIdOverride,
    _retried = false,
    headers: customHeaders,
    ...fetchInit
  } = options

  const headers = new Headers(customHeaders)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = await appStorage.get(STORAGE_KEYS.ACCESS_TOKEN)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (requireProfile) {
    const profileId = profileIdOverride ?? (await appStorage.get(STORAGE_KEYS.ACTIVE_PROFILE_ID))
    if (!profileId) {
      throw new ApiError(400, 'Chưa chọn hồ sơ bé (X-Profile-ID)')
    }
    headers.set('X-Profile-ID', profileId)
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
    ...fetchInit,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && !skipAuth && !_retried) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true })
    }
  }

  if (!response.ok) {
    let detail = `Lỗi kết nối (${response.status})`
    try {
      const errJson = (await response.json()) as { error?: string; message?: string }
      if (errJson.error) detail = errJson.error
      else if (errJson.message) detail = errJson.message
    } catch {
      // keep fallback message
    }
    throw new ApiError(response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
