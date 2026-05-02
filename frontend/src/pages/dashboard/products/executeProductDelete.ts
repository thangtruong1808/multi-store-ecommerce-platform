import type { Dispatch, SetStateAction } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { ProductDetail, ProductItem, ProductsResponse } from '../dashboardTypes'

type DeleteOpts = {
  setProductsState: Dispatch<SetStateAction<ProductsResponse>>
  setConfirmDeleteProduct: Dispatch<SetStateAction<ProductItem | null>>
  setEditingProduct: Dispatch<SetStateAction<ProductDetail | null>>
  setIsProductFormOpen: Dispatch<SetStateAction<boolean>>
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>
  editingProduct: ProductDetail | null
  product: ProductItem
}

export async function executeProductSoftDelete(opts: DeleteOpts): Promise<void> {
  const {
    setProductsState,
    setConfirmDeleteProduct,
    setEditingProduct,
    setIsProductFormOpen,
    setInlineStatusType,
    setInlineStatusMessage,
    editingProduct,
    product,
  } = opts

  const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/${product.id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(errorPayload?.message ?? `Unable to delete product (${response.status})`)
  }

  setProductsState((prev) => ({
    ...prev,
    items: prev.items.map((item) => (item.id === product.id ? { ...item, status: 'inactive' } : item)),
  }))
  setConfirmDeleteProduct(null)
  if (editingProduct?.id === product.id) {
    setEditingProduct(null)
    setIsProductFormOpen(false)
  }
  setInlineStatusType('success')
  setInlineStatusMessage(`Delete successful: ${product.name} is now inactive.`)
}
