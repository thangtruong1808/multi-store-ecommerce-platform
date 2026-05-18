import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'

export type UploadProductImageResult = {
  blobKey: string
  publicUrl: string
}

export async function uploadProductImage(
  file: File,
  productId?: string | null,
): Promise<UploadProductImageResult> {
  const formData = new FormData()
  formData.append('file', file)

  const query = productId ? `?productId=${encodeURIComponent(productId)}` : ''
  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/media/images${query}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    let message = `Upload failed (${response.status})`
    try {
      const payload = (await response.json()) as { message?: string; errors?: Record<string, string> }
      if (payload.errors?.file) {
        message = payload.errors.file
      } else if (payload.message) {
        message = payload.message
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return (await response.json()) as UploadProductImageResult
}

export async function deleteProductImage(blobKey: string): Promise<void> {
  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/media/images`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobKey }),
  })

  if (!response.ok) {
    let message = `Unable to delete image (${response.status})`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) {
        message = payload.message
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
}
