import type { Dispatch, SetStateAction } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { StoreItem, StoresResponse } from '../dashboardTypes'

type DeleteOpts = {
  store: StoreItem
  setStoresState: Dispatch<SetStateAction<StoresResponse>>
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>
  setConfirmDeleteStore: Dispatch<SetStateAction<StoreItem | null>>
}

export async function executeStoreDelete(opts: DeleteOpts): Promise<void> {
  const { store, setStoresState, setInlineStatusType, setInlineStatusMessage, setConfirmDeleteStore } = opts

  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/stores/${store.id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const msg =
      response.status === 403
        ? 'You do not have permission to deactivate stores.'
        : payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: string }).message === 'string'
          ? (payload as { message: string }).message
          : `Unable to deactivate store (${response.status})`
    throw new Error(msg)
  }

  setStoresState((prev) => ({
    ...prev,
    items: prev.items.map((item) =>
      item.id === store.id
        ? {
            ...item,
            isActive: false,
          }
        : item,
    ),
  }))
  setInlineStatusType('success')
  setInlineStatusMessage(`Store deactivated: ${store.name}.`)
  setConfirmDeleteStore(null)
}
