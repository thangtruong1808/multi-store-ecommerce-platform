import type { ApiErrorPayload } from './authTypes'

export const parseErrorPayload = async (
  response: Response,
  fallbackMessage: string,
): Promise<ApiErrorPayload> => {
  let payload: { message?: string; errors?: Record<string, string> } | null = null
  try {
    payload = (await response.json()) as { message?: string; errors?: Record<string, string> }
  } catch {
    payload = null
  }

  return {
    message: payload?.message ?? fallbackMessage,
    errors: payload?.errors ?? {},
    status: response.status,
  }
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
