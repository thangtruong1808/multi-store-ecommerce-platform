import { API_BASE_URL } from '../auth/authConstants'

export type ContactSubmitPayload = {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

export async function submitContactForm(payload: ContactSubmitPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone?.trim() || undefined,
      subject: payload.subject,
      message: payload.message,
    }),
  })

  if (!response.ok) {
    let message = 'Unable to send your message. Please try again.'
    try {
      const body = (await response.json()) as {
        message?: string
        errors?: Record<string, string>
      }
      if (body.errors) {
        const first = Object.values(body.errors)[0]
        if (first) {
          message = first
        }
      } else if (body.message) {
        message = body.message
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
}
