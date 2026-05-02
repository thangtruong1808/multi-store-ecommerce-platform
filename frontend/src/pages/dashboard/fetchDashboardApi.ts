import { store } from '../../app/store'
import { AUTH_SESSION_HINT_KEY } from '../../features/auth/authConstants'
import { clearAuthState } from '../../features/auth/authSlice'
import { refreshAccessTokenResult } from '../../features/auth/refreshAccessToken'

/** Clears Redux auth when refresh tokens are gone or invalid — also used during dashboard warmup. */
export function invalidateDashboardSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
  }
  store.dispatch(clearAuthState())
}

function invalidateSessionAfterUnauthorized() {
  invalidateDashboardSession()
}

export async function fetchWithAutoRefresh(input: string, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init)
  if (response.status !== 401) {
    return response
  }

  const refreshed = await refreshAccessTokenResult()
  if (!refreshed.ok) {
    if (refreshed.sessionInvalid) {
      invalidateSessionAfterUnauthorized()
    }
    return response
  }

  response = await fetch(input, init)
  if (response.status === 401) {
    invalidateSessionAfterUnauthorized()
  }

  return response
}
