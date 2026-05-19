import { API_BASE_URL } from '../../../features/auth/authConstants'
import { refreshAccessToken } from '../../../features/auth/refreshAccessToken'

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback
  }
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(contentDisposition)
  if (match?.[1]) {
    return decodeURIComponent(match[1].replace(/"/g, '').trim())
  }
  return fallback
}

export function isDashboardInvoiceDownloadable(paymentStatus: string): boolean {
  return paymentStatus.toLowerCase() === 'succeeded'
}

export async function downloadDashboardInvoice(orderId: string, orderNumber: string): Promise<void> {
  const url = `${API_BASE_URL}/api/dashboard/invoices/${encodeURIComponent(orderId)}/pdf`
  const go = () =>
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/pdf' },
    })

  let response = await go()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await go()
    }
  }

  if (response.status === 401) {
    throw new Error('Please sign in to download invoices.')
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { message?: string }
      throw new Error(body.message ?? 'Unable to download invoice.')
    }
    throw new Error('Unable to download invoice.')
  }

  if (!contentType.includes('application/pdf')) {
    throw new Error('Invoice download returned an unexpected response.')
  }

  const blob = await response.blob()
  const fallbackName = `invoice-${orderNumber.replace(/\//g, '-')}.pdf`
  const filename = parseFilename(response.headers.get('Content-Disposition'), fallbackName)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
