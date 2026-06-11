const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
/** Cold start on Azure Container Apps can exceed 8s; keep users on loading UI longer. */
export const HEALTH_TIMEOUT_MS = 90_000

export type HealthPayload = {
  status?: string
  message?: string
}

export type HealthFailureReason = 'maintenance' | 'waking'

export type SystemHealthResult =
  | { ok: true }
  | { ok: false; reason: HealthFailureReason; message: string }

async function fetchHealthOnce(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  })
}

export async function fetchSystemHealth(): Promise<SystemHealthResult> {
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
            reason: 'maintenance',
            message:
              body?.message?.trim() ||
              'We are updating the store and will be back shortly.',
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
          return {
            ok: false,
            reason: 'waking',
            message: 'Services are still starting. Please wait a moment.',
          }
        }

        if (body?.status === 'ok') {
          return { ok: true }
        }

        const isMaintenance =
          body?.status === 'maintenance' ||
          Boolean(body?.message?.toLowerCase().includes('maintenance'))

        return {
          ok: false,
          reason: isMaintenance ? 'maintenance' : 'waking',
          message:
            body?.message?.trim() ||
            (isMaintenance
              ? 'We are updating the store and will be back shortly.'
              : 'Services are still starting. Please wait a moment.'),
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return {
            ok: false,
            reason: 'waking',
            message: 'Services are still starting. Please wait a moment.',
          }
        }
        lastError = 'Could not connect yet while services are starting.'
      }
    }

    return {
      ok: false,
      reason: 'waking',
      message: lastError ?? 'Services are still starting. Please wait a moment.',
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
