import type { Dispatch, SetStateAction } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { CategoryParentOption, ProductDetail, ProductFormState, ProductsResponse } from '../dashboardTypes'

function formatProductSaveError(payload: unknown, status: number): string {
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
      if (fieldErrors.length > 0) {
        parts.push(fieldErrors)
      }
    }
    if (parts.length > 0) {
      return parts.join(' — ')
    }
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }
  return `Unable to save product (${status})`
}

type UpsertOpts = {
  editingProduct: ProductDetail | null
  productForm: ProductFormState
  level3Options: CategoryParentOption[]
  productCategoriesTree: CategoryParentOption[]
  setProductsState: Dispatch<SetStateAction<ProductsResponse>>
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>
  setEditingProduct: Dispatch<SetStateAction<ProductDetail | null>>
  setIsProductFormOpen: Dispatch<SetStateAction<boolean>>
  resetProductForm: () => void
}

export async function executeProductUpsert(opts: UpsertOpts): Promise<void> {
  const {
    editingProduct,
    productForm,
    level3Options,
    productCategoriesTree,
    setProductsState,
    setInlineStatusType,
    setInlineStatusMessage,
    setEditingProduct,
    setIsProductFormOpen,
    resetProductForm,
  } = opts

  if (productForm.level3Id === 'none') {
    throw new Error('categoryId: Choose a level 3 category before saving.')
  }

  const payload = {
    sku: productForm.sku.trim(),
    name: productForm.name.trim(),
    description: productForm.description.trim(),
    basePrice: Number(productForm.basePrice || 0),
    status: productForm.status,
    categoryId: productForm.level3Id,
    isClearance: productForm.isClearance,
    isRefurbished: productForm.isRefurbished,
    imageS3Keys: productForm.imageS3Keys.map((item) => item.trim()).filter((item) => item.length > 0),
    videoUrls: productForm.videoUrls.map((item) => item.trim()).filter((item) => item.length > 0),
  }
  const response = await fetchWithAutoRefresh(
    editingProduct ? `${API_BASE_URL}/api/products/${editingProduct.id}` : `${API_BASE_URL}/api/products`,
    {
      method: editingProduct ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(formatProductSaveError(errorPayload, response.status))
  }

  const saved = (await response.json()) as ProductDetail
  const categoryName =
    level3Options.find((item) => item.id === saved.categoryId)?.name ??
    productCategoriesTree.find((item) => item.id === saved.categoryId)?.name ??
    saved.categoryName

  if (editingProduct) {
    setProductsState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === saved.id
          ? {
              ...item,
              ...saved,
              categoryName,
              imageCount: saved.imageS3Keys.length,
              videoCount: saved.videoUrls.length,
            }
          : item,
      ),
    }))
    setInlineStatusType('success')
    setInlineStatusMessage(`Edit successful: ${saved.name} was updated.`)
  } else {
    setProductsState((prev) => ({
      ...prev,
      items: [
        {
          ...saved,
          categoryName,
          imageCount: saved.imageS3Keys.length,
          videoCount: saved.videoUrls.length,
        },
        ...prev.items,
      ].slice(0, prev.pageSize),
      totalItems: prev.totalItems + 1,
    }))
    setInlineStatusType('success')
    setInlineStatusMessage(`Create successful: ${saved.name} was added.`)
  }

  setEditingProduct(null)
  setIsProductFormOpen(false)
  resetProductForm()
}
