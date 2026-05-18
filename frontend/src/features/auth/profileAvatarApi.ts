import { API_BASE_URL } from './authConstants'
import { fetchWithAutoRefresh } from '../../pages/dashboard/fetchDashboardApi'

export type UploadProfileAvatarResult = {
  blobKey: string
  publicUrl: string
  avatarS3Key: string
}

export async function uploadProfileAvatar(file: File): Promise<UploadProfileAvatarResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/profile/avatar`, {
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

  return (await response.json()) as UploadProfileAvatarResult
}
