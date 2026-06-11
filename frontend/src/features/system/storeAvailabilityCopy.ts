import type { HealthFailureReason } from './healthApi'

export const WAKE_UP_COPY = {
  title: 'Starting up',
  body: 'Services are waking from idle. This usually takes 1–2 minutes.',
  sub: 'Please wait — no action needed.',
  retryLabel: 'Try again',
  retryingLabel: 'Checking…',
} as const

export const MAINTENANCE_COPY = {
  title: 'Scheduled maintenance',
  sub: 'Thank you for your patience.',
  fallbackBody: 'We are updating the store and will be back shortly.',
} as const

export const LOADING_COPY = {
  title: 'Starting up…',
  body: 'First visit may take 1–2 minutes while containers warm up.',
} as const

export function copyForHealthFailure(reason: HealthFailureReason, apiMessage: string | null) {
  if (reason === 'maintenance') {
    return {
      title: MAINTENANCE_COPY.title,
      body: apiMessage?.trim() || MAINTENANCE_COPY.fallbackBody,
      sub: MAINTENANCE_COPY.sub,
      showWakeAnimation: false,
    }
  }

  return {
    title: WAKE_UP_COPY.title,
    body: WAKE_UP_COPY.body,
    sub: WAKE_UP_COPY.sub,
    showWakeAnimation: true,
  }
}
