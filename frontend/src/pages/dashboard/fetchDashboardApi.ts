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

/**
 * Builds a fresh RequestInit for retry. The first `fetch` may consume a body stream; reusing the
 * same init can send an empty body on POST/PUT and yield 400 from the API.
 */
function cloneInitForRetry(init?: RequestInit): RequestInit | undefined {
  if (!init) {
    return undefined
  }

  const retry: RequestInit = {
    method: init.method,
    credentials: init.credentials,
    cache: init.cache,
    redirect: init.redirect,
    referrer: init.referrer,
    referrerPolicy: init.referrerPolicy,
    mode: init.mode,
    signal: init.signal,
    headers: init.headers !== undefined ? new Headers(init.headers as HeadersInit) : undefined,
  }

  const { body } = init
  if (body === undefined || body === null) {
    return retry
  }

  if (typeof body === 'string') {
    retry.body = body
    return retry
  }

  if (body instanceof URLSearchParams) {
    retry.body = new URLSearchParams(body.toString())
    return retry
  }

  if (body instanceof FormData) {
    const copy = new FormData()
    body.forEach((value, key) => {
      copy.append(key, value)
    })
    retry.body = copy
    return retry
  }

  if (body instanceof Blob) {
    retry.body = body.slice()
    return retry
  }

  if (body instanceof ArrayBuffer) {
    retry.body = body.slice(0)
    return retry
  }

  if (ArrayBuffer.isView(body)) {
    const view = body as ArrayBufferView
    retry.body = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
    return retry
  }

  retry.body = body
  return retry
}

function isMutatingMethod(init?: RequestInit): boolean {
  const method = (init?.method ?? 'GET').toUpperCase()
  return !['GET', 'HEAD', 'OPTIONS'].includes(method)
}

/**
 * Dashboard API helper: refreshes the access cookie before mutating requests when possible,
 * so a just-expired access token does not produce a visible 401 on the first hop (DevTools + failed resource noise)
 * while the automatic retry still succeeds.
 */
export async function fetchWithAutoRefresh(input: string | URL, init?: RequestInit): Promise<Response> {
  if (isMutatingMethod(init)) {
    const pre = await refreshAccessTokenResult()
    if (!pre.ok && pre.sessionInvalid) {
      invalidateSessionAfterUnauthorized()
      return new Response(JSON.stringify({ message: 'Your session has expired. Please sign in again.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

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

  response = await fetch(input, cloneInitForRetry(init))
  if (response.status === 401) {
    invalidateSessionAfterUnauthorized()
  }

  return response
}
