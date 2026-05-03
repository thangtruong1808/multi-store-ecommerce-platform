import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { executeStoreDelete } from '../stores/executeStoreDelete'
import { executeStoreUpsert } from '../stores/executeStoreUpsert'
import type { DashboardFeatureKey, StoreFormState, StoreItem, StoresResponse } from '../dashboardTypes'

type ListSlice = {
  setStoresState: Dispatch<SetStateAction<StoresResponse>>
}

export function useDashboardStoresForm(
  activeFeature: DashboardFeatureKey,
  list: ListSlice,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
) {
  const { setStoresState } = list
  const isAdmin = useAppSelector((s) => s.auth.user?.role === 'admin')

  const [editingStore, setEditingStore] = useState<StoreItem | null>(null)
  const [isStoreFormOpen, setIsStoreFormOpen] = useState(false)
  const [confirmDeleteStore, setConfirmDeleteStore] = useState<StoreItem | null>(null)
  const [isStoreSaving, setIsStoreSaving] = useState(false)
  const [isStoreDeleting, setIsStoreDeleting] = useState(false)
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null)
  const [storeForm, setStoreForm] = useState<StoreFormState>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    defaultCurrencyCode: 'AUD',
    timezone: 'Australia/Sydney',
    isActive: true,
  })

  useEffect(() => {
    if (activeFeature !== 'stores') {
      setIsStoreFormOpen(false)
      setEditingStore(null)
      setConfirmDeleteStore(null)
      setStoreForm({
        name: '',
        slug: '',
        email: '',
        phone: '',
        defaultCurrencyCode: 'AUD',
        timezone: 'Australia/Sydney',
        isActive: true,
      })
    }
  }, [activeFeature])

  const resetStoreForm = () => {
    setStoreForm({
      name: '',
      slug: '',
      email: '',
      phone: '',
      defaultCurrencyCode: 'AUD',
      timezone: 'Australia/Sydney',
      isActive: true,
    })
  }

  const closeStoreForm = () => {
    setEditingStore(null)
    setIsStoreFormOpen(false)
    resetStoreForm()
  }

  const openCreateStoreForm = () => {
    if (!isAdmin) return
    setEditingStore(null)
    setIsStoreFormOpen(true)
    resetStoreForm()
    setInlineStatusMessage(null)
  }

  const openEditStoreForm = (store: StoreItem) => {
    if (!isAdmin) return
    setEditingStore(store)
    setIsStoreFormOpen(true)
    setStoreForm({
      name: store.name,
      slug: store.slug,
      email: store.email ?? '',
      phone: store.phone ?? '',
      defaultCurrencyCode: store.defaultCurrencyCode,
      timezone: store.timezone,
      isActive: store.isActive,
    })
    setInlineStatusMessage(null)
  }

  const handleSaveStore = async () => {
    if (!isAdmin) return
    const hasChanges =
      editingStore === null
        ? storeForm.name.trim().length >= 2
        : storeForm.name.trim() !== editingStore.name ||
          storeForm.slug.trim().toLowerCase() !== editingStore.slug.toLowerCase() ||
          (storeForm.email.trim() || '') !== (editingStore.email ?? '') ||
          (storeForm.phone.trim() || '') !== (editingStore.phone ?? '') ||
          storeForm.defaultCurrencyCode.trim() !== editingStore.defaultCurrencyCode ||
          storeForm.timezone.trim() !== editingStore.timezone ||
          storeForm.isActive !== editingStore.isActive

    if (!hasChanges) return

    setIsStoreSaving(true)
    setInlineStatusMessage(null)
    try {
      await executeStoreUpsert({
        editingStore,
        storeForm,
        setStoresState,
        setInlineStatusType,
        setInlineStatusMessage,
        setEditingStore,
        setIsStoreFormOpen,
        resetStoreForm,
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to save store.')
    } finally {
      setIsStoreSaving(false)
    }
  }

  const handleDeleteStore = async (store: StoreItem) => {
    if (!isAdmin) return
    setIsStoreDeleting(true)
    setDeletingStoreId(store.id)
    setInlineStatusMessage(null)
    try {
      await executeStoreDelete({
        store,
        setStoresState,
        setInlineStatusType,
        setInlineStatusMessage,
        setConfirmDeleteStore,
      })
      if (editingStore?.id === store.id) {
        setEditingStore(null)
        setIsStoreFormOpen(false)
      }
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to deactivate store.')
    } finally {
      setIsStoreDeleting(false)
      setDeletingStoreId(null)
    }
  }

  return {
    isAdmin,
    editingStore,
    isStoreFormOpen,
    confirmDeleteStore,
    setConfirmDeleteStore,
    isStoreSaving,
    isStoreDeleting,
    deletingStoreId,
    storeForm,
    setStoreForm,
    closeStoreForm,
    openCreateStoreForm,
    openEditStoreForm,
    handleSaveStore,
    handleDeleteStore,
  }
}
