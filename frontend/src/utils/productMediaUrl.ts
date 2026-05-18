import { API_BASE_URL } from '../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../pages/dashboard/fetchDashboardApi'

let cachedPublicBaseUrl: string | null = null

export function getConfiguredProductMediaBaseUrl(): string | null {
  const fromEnv = import.meta.env.VITE_PRODUCT_MEDIA_BASE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  return cachedPublicBaseUrl
}

export async function loadProductMediaPublicBaseUrl(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_PRODUCT_MEDIA_BASE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  if (cachedPublicBaseUrl) {
    return cachedPublicBaseUrl
  }

  try {
    const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/media/config`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as { publicBaseUrl?: string | null }
    const base = payload.publicBaseUrl?.trim().replace(/\/$/, '') ?? null
    cachedPublicBaseUrl = base
    return base
  } catch {
    return null
  }
}

export function buildProductMediaUrl(blobKey: string, baseUrl: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedKey = blobKey.replace(/^\//, '')
  return `${normalizedBase}/${normalizedKey}`
}

export function isStagingBlobKey(blobKey: string): boolean {
  return blobKey.includes('/staging/')
}
