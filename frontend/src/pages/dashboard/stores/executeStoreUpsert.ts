import type { Dispatch, SetStateAction } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { StoreFormState, StoreItem, StoresResponse } from '../dashboardTypes'

function formatError(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const p = payload as { message?: unknown; errors?: Record<string, string> }
    const parts: string[] = []
    if (typeof p.message === 'string' && p.message.trim().length > 0) {
      parts.push(p.message.trim())
    }
    if (p.errors && typeof p.errors === 'object') {
      const fieldErrors = Object.entries(p.errors)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' ')
      if (fieldErrors.length > 0) parts.push(fieldErrors)
    }
    if (parts.length > 0) return parts.join(' — ')
  }
  if (status === 403) return 'You do not have permission to modify stores.'
  return `Unable to save store (${status})`
}

type UpsertOpts = {
  editingStore: StoreItem | null
  storeForm: StoreFormState
  setStoresState: Dispatch<SetStateAction<StoresResponse>>
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>
  setEditingStore: Dispatch<SetStateAction<StoreItem | null>>
  setIsStoreFormOpen: Dispatch<SetStateAction<boolean>>
  resetStoreForm: () => void
}

export async function executeStoreUpsert(opts: UpsertOpts): Promise<void> {
  const {
    editingStore,
    storeForm,
    setStoresState,
    setInlineStatusType,
    setInlineStatusMessage,
    setEditingStore,
    setIsStoreFormOpen,
    resetStoreForm,
  } = opts

  const payload = {
    name: storeForm.name.trim(),
    slug: storeForm.slug.trim(),
    email: storeForm.email.trim() || null,
    phone: storeForm.phone.trim() || null,
    defaultCurrencyCode: storeForm.defaultCurrencyCode.trim() || 'AUD',
    timezone: storeForm.timezone.trim() || 'Australia/Sydney',
    isActive: storeForm.isActive,
  }

  const response = await fetchWithAutoRefresh(
    editingStore ? `${API_BASE_URL}/api/stores/${editingStore.id}` : `${API_BASE_URL}/api/stores`,
    {
      method: editingStore ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(formatError(errorPayload, response.status))
  }

  const saved = (await response.json()) as StoreItem

  if (editingStore) {
    setStoresState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === saved.id
          ? {
              ...item,
              ...saved,
            }
          : item,
      ),
    }))
    setInlineStatusType('success')
    setInlineStatusMessage(`Store updated: ${saved.name}.`)
  } else {
    setStoresState((prev) => ({
      ...prev,
      items: [
        {
          ...saved,
        },
        ...prev.items,
      ].slice(0, prev.pageSize),
      totalItems: prev.totalItems + 1,
    }))
    setInlineStatusType('success')
    setInlineStatusMessage(`Store created: ${saved.name}.`)
  }

  setEditingStore(null)
  setIsStoreFormOpen(false)
  resetStoreForm()
}
