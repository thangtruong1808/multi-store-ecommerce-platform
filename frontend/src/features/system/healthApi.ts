const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
const HEALTH_TIMEOUT_MS = 8_000

export type HealthPayload = {
  status?: string
  message?: string
}

async function fetchHealthOnce(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  })
}

export async function fetchSystemHealth(): Promise<{ ok: true } | { ok: false; message: string }> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

  const paths = [`${apiBaseUrl}/api/health`, '/api/health']

  try {
    let lastError: string | null = null

    for (const url of paths) {
      try {
        const response = await fetchHealthOnce(url, controller.signal)

        if (response.status === 503) {
          let body: HealthPayload | null = null
          try {
            body = (await response.json()) as HealthPayload
          } catch {
            body = null
          }
          return {
            ok: false,
            message:
              body?.message?.trim() ||
              'We are currently under maintenance. Please come back later.',
          }
        }

        if (!response.ok) {
          lastError = `Service unavailable (${response.status}).`
          continue
        }

        let body: HealthPayload | null = null
        try {
          body = (await response.json()) as HealthPayload
        } catch {
          return { ok: false, message: 'Could not reach the store services. Please try again shortly.' }
        }

        if (body?.status === 'ok') {
          return { ok: true }
        }

        return {
          ok: false,
          message:
            body?.message?.trim() ||
            'We are currently under maintenance. Please come back later.',
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return {
            ok: false,
            message: 'The store is taking too long to respond. Please try again in a few minutes.',
          }
        }
        lastError = 'Could not connect to the store. Please check your connection and try again.'
      }
    }

    return {
      ok: false,
      message: lastError ?? 'Could not connect to the store. Please try again shortly.',
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
