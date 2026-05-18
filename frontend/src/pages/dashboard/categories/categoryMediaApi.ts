import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'

export type UploadCategoryImageResult = {
  blobKey: string
  publicUrl: string
}

export async function uploadCategoryImage(
  file: File,
  categoryId?: string | null,
): Promise<UploadCategoryImageResult> {
  const formData = new FormData()
  formData.append('file', file)

  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''
  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/media/image${query}`, {
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

  return (await response.json()) as UploadCategoryImageResult
}

export async function deleteCategoryImage(blobKey: string): Promise<void> {
  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/media/image`, {
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

export function isStagingCategoryBlobKey(blobKey: string): boolean {
  return blobKey.startsWith('categories/') && blobKey.includes('/staging/')
}
