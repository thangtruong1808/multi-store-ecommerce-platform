import { API_BASE_URL } from './authConstants'

export type RefreshCookieResult = {
  ok: boolean
  /** Refresh endpoint rejects the renewal (e.g. expired / revoked refresh cookie). */
  sessionInvalid: boolean
}

let refreshInFlight: Promise<RefreshCookieResult> | null = null

async function runSerializedRefresh(): Promise<RefreshCookieResult> {
  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const sessionInvalid = refreshResponse.status === 401 || refreshResponse.status === 403
    return { ok: refreshResponse.ok, sessionInvalid }
  } catch {
    return { ok: false, sessionInvalid: false }
  } finally {
    refreshInFlight = null
  }
}

/** Serialize refresh; backend rotates the refresh cookie so concurrent POST /refresh races cause 401. */
export async function refreshAccessTokenResult(): Promise<RefreshCookieResult> {
  if (!refreshInFlight) {
    refreshInFlight = runSerializedRefresh()
  }
  return refreshInFlight
}

export async function refreshAccessToken(): Promise<boolean> {
  const result = await refreshAccessTokenResult()
  return result.ok
}
