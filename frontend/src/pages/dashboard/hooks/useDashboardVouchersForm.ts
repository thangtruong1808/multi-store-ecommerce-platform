import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type {
  DashboardFeatureKey,
  ManagedStoreOption,
  ProductItem,
  VoucherFormState,
  VoucherItem,
  VouchersResponse,
} from '../dashboardTypes'

type ListSlice = {
  setVouchersState: Dispatch<SetStateAction<VouchersResponse>>
}

const emptyVoucherForm = (): VoucherFormState => ({
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
  minOrderAmount: '',
  maxRedemptions: '',
  storeIds: [],
  productIds: [],
})

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function defaultExpiryDate(): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + 3)
  return d.toISOString().slice(0, 10)
}

export function useDashboardVouchersForm(
  activeFeature: DashboardFeatureKey,
  list: ListSlice,
  managedStores: ManagedStoreOption[],
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
) {
  const { setVouchersState } = list
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null)
  const [isVoucherFormOpen, setIsVoucherFormOpen] = useState(false)
  const [confirmDeleteVoucher, setConfirmDeleteVoucher] = useState<VoucherItem | null>(null)
  const [isVoucherSaving, setIsVoucherSaving] = useState(false)
  const [isVoucherDeleting, setIsVoucherDeleting] = useState(false)
  const [deletingVoucherId, setDeletingVoucherId] = useState<string | null>(null)
  const [voucherForm, setVoucherForm] = useState<VoucherFormState>(emptyVoucherForm)
  const [productPickerItems, setProductPickerItems] = useState<ProductItem[]>([])
  const [isProductPickerLoading, setIsProductPickerLoading] = useState(false)
  const [productPickerSearch, setProductPickerSearch] = useState('')

  useEffect(() => {
    if (activeFeature !== 'vouchers') {
      setIsVoucherFormOpen(false)
      setEditingVoucher(null)
      setConfirmDeleteVoucher(null)
      setVoucherForm(emptyVoucherForm())
    }
  }, [activeFeature])

  useEffect(() => {
    if (activeFeature !== 'vouchers' || !isVoucherFormOpen) return
    let alive = true
    const loadProducts = async () => {
      setIsProductPickerLoading(true)
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '50', status: 'active' })
        if (productPickerSearch.trim()) query.set('q', productPickerSearch.trim())
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Unable to load products')
        const payload = (await response.json()) as { items?: ProductItem[] }
        if (alive) setProductPickerItems(payload.items ?? [])
      } catch {
        if (alive) setProductPickerItems([])
      } finally {
        if (alive) setIsProductPickerLoading(false)
      }
    }
    void loadProducts()
    return () => {
      alive = false
    }
  }, [activeFeature, isVoucherFormOpen, productPickerSearch])

  const openCreateVoucher = () => {
    setEditingVoucher(null)
    setVoucherForm({ ...emptyVoucherForm(), expiresAt: defaultExpiryDate() })
    setIsVoucherFormOpen(true)
  }

  const openEditVoucher = async (item: VoucherItem) => {
    setIsVoucherSaving(true)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/vouchers/${item.id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Unable to load voucher details')
      const detail = (await response.json()) as VoucherItem & {
        storeIds?: string[]
        productIds?: string[]
      }
      setEditingVoucher({
        ...item,
        ...detail,
        storeIds: detail.storeIds,
        productIds: detail.productIds,
      } as VoucherItem & { storeIds?: string[]; productIds?: string[] })
      setVoucherForm({
        code: detail.code,
        description: detail.description ?? '',
        discountType: detail.discountType,
        discountValue: String(detail.discountValue),
        startsAt: toDateInputValue(detail.startsAt),
        expiresAt: toDateInputValue(detail.expiresAt),
        isActive: detail.isActive,
        minOrderAmount: detail.minOrderAmount != null ? String(detail.minOrderAmount) : '',
        maxRedemptions: detail.maxRedemptions != null ? String(detail.maxRedemptions) : '',
        storeIds: detail.storeIds ?? [],
        productIds: detail.productIds ?? [],
      })
      setIsVoucherFormOpen(true)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to open voucher')
    } finally {
      setIsVoucherSaving(false)
    }
  }

  const buildPayload = () => {
    const discountValue = Number.parseFloat(voucherForm.discountValue)
    const minOrder = voucherForm.minOrderAmount.trim()
      ? Number.parseFloat(voucherForm.minOrderAmount)
      : null
    const maxRed = voucherForm.maxRedemptions.trim()
      ? Number.parseInt(voucherForm.maxRedemptions, 10)
      : null

    const startsAt = voucherForm.startsAt.trim()
      ? new Date(`${voucherForm.startsAt}T00:00:00.000Z`).toISOString()
      : null
    const expiresAt = new Date(`${voucherForm.expiresAt}T23:59:59.000Z`).toISOString()

    return {
      code: voucherForm.code.trim(),
      description: voucherForm.description.trim() || null,
      discountType: voucherForm.discountType,
      discountValue,
      startsAt,
      expiresAt,
      isActive: voucherForm.isActive,
      minOrderAmount: minOrder,
      maxRedemptions: maxRed,
      storeIds: voucherForm.storeIds,
      productIds: voucherForm.productIds,
    }
  }

  const handleSaveVoucher = async () => {
    setIsVoucherSaving(true)
    setInlineStatusMessage(null)
    try {
      const payload = buildPayload()
      const url = editingVoucher
        ? `${API_BASE_URL}/api/vouchers/${editingVoucher.id}`
        : `${API_BASE_URL}/api/vouchers`
      const response = await fetchWithAutoRefresh(url, {
        method: editingVoucher ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Unable to save voucher')
      }
      const saved = (await response.json()) as VoucherItem
      setVouchersState((prev) => {
        const exists = prev.items.some((v) => v.id === saved.id)
        const items = exists
          ? prev.items.map((v) => (v.id === saved.id ? { ...v, ...saved } : v))
          : [saved, ...prev.items]
        return { ...prev, items }
      })
      setIsVoucherFormOpen(false)
      setEditingVoucher(null)
      setVoucherForm(emptyVoucherForm())
      setInlineStatusType('success')
      setInlineStatusMessage(editingVoucher ? 'Voucher updated.' : 'Voucher created.')
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to save voucher')
    } finally {
      setIsVoucherSaving(false)
    }
  }

  const handleDeleteVoucher = async () => {
    if (!confirmDeleteVoucher) return
    setIsVoucherDeleting(true)
    setDeletingVoucherId(confirmDeleteVoucher.id)
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(
        `${API_BASE_URL}/api/vouchers/${confirmDeleteVoucher.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Unable to deactivate voucher')
      }
      setVouchersState((prev) => ({
        ...prev,
        items: prev.items.map((v) =>
          v.id === confirmDeleteVoucher.id ? { ...v, isActive: false, status: 'Inactive' } : v,
        ),
      }))
      setConfirmDeleteVoucher(null)
      setInlineStatusType('success')
      setInlineStatusMessage('Voucher deactivated.')
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to deactivate voucher')
    } finally {
      setIsVoucherDeleting(false)
      setDeletingVoucherId(null)
    }
  }

  const toggleStoreId = (storeId: string) => {
    setVoucherForm((prev) => {
      const has = prev.storeIds.includes(storeId)
      return {
        ...prev,
        storeIds: has ? prev.storeIds.filter((id) => id !== storeId) : [...prev.storeIds, storeId],
      }
    })
  }

  const toggleProductId = (productId: string) => {
    setVoucherForm((prev) => {
      const has = prev.productIds.includes(productId)
      return {
        ...prev,
        productIds: has ? prev.productIds.filter((id) => id !== productId) : [...prev.productIds, productId],
      }
    })
  }

  return {
    editingVoucher,
    setEditingVoucher,
    isVoucherFormOpen,
    setIsVoucherFormOpen,
    confirmDeleteVoucher,
    setConfirmDeleteVoucher,
    isVoucherSaving,
    isVoucherDeleting,
    deletingVoucherId,
    voucherForm,
    setVoucherForm,
    productPickerItems,
    isProductPickerLoading,
    productPickerSearch,
    setProductPickerSearch,
    managedStores,
    openCreateVoucher,
    openEditVoucher,
    handleSaveVoucher,
    handleDeleteVoucher,
    toggleStoreId,
    toggleProductId,
  }
}
