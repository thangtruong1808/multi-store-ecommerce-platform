const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string
      errors?: Record<string, string>
    }
    if (payload.errors) {
      const first = Object.values(payload.errors)[0]
      if (first) return first
    }
    if (payload.message) return payload.message
  } catch {
    // ignore parse errors
  }
  return fallback
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/password-reset-request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to request password reset. Please try again.'))
  }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/password-reset-confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to reset password. Please try again.'))
  }
}
