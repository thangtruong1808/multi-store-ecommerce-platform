import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { API_BASE_URL } from '../../../features/auth/authConstants'
import { executeProductSoftDelete } from '../products/executeProductDelete'
import { deleteProductImage, uploadProductImage } from '../products/productMediaApi'
import { executeProductUpsert } from '../products/executeProductUpsert'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import { isStagingBlobKey, loadProductMediaPublicBaseUrl } from '../../../utils/productMediaUrl'
import { computeHasProductChanges } from '../dashboardDerivedFlags'
import type {
  CategoryParentOption,
  DashboardFeatureKey,
  ManagedStoreOption,
  ProductDetail,
  ProductFormState,
  ProductItem,
  ProductsResponse,
} from '../dashboardTypes'

type ProductsListSlice = {
  setProductsState: Dispatch<SetStateAction<ProductsResponse>>
  productCategoriesTree: CategoryParentOption[]
}

function storeQuantitiesForIds(storeIds: string[], detail: ProductDetail | null): Record<string, string> {
  const stock = detail?.storeStock ?? []
  const out: Record<string, string> = {}
  for (const id of storeIds) {
    const row = stock.find((s) => s.storeId === id)
    out[id] = String(row?.quantity ?? 0)
  }
  return out
}

export function useDashboardProductsForm(
  activeFeature: DashboardFeatureKey,
  pageSize: number,
  list: ProductsListSlice,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const { setProductsState, productCategoriesTree } = list
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdminUser = userRole === 'admin'
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductItem | null>(null)
  const [isProductSaving, setIsProductSaving] = useState(false)
  const [isProductDeleting, setIsProductDeleting] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>({
    sku: '',
    name: '',
    description: '',
    basePrice: '',
    status: 'active',
    isClearance: false,
    isRefurbished: false,
    level1Id: 'none',
    level2Id: 'none',
    level3Id: 'none',
    imageS3Keys: [],
    videoUrls: [],
    storeIds: [],
    storeQuantities: {},
  })

  const [managedStores, setManagedStores] = useState<ManagedStoreOption[]>([])
  const [isManagedStoresLoading, setIsManagedStoresLoading] = useState(false)
  const [uploadingImageIndexes, setUploadingImageIndexes] = useState<Record<number, boolean>>({})
  const [productMediaBaseUrl, setProductMediaBaseUrl] = useState<string | null>(null)

  useEffect(() => {
    if (activeFeature !== 'products' || !dashboardApiReady) {
      return
    }
    let mounted = true
    void loadProductMediaPublicBaseUrl().then((base) => {
      if (mounted) setProductMediaBaseUrl(base)
    })
    return () => {
      mounted = false
    }
  }, [activeFeature, dashboardApiReady])

  useEffect(() => {
    if (activeFeature !== 'products' || !dashboardApiReady) {
      return
    }
    let mounted = true
    const loadManaged = async () => {
      setIsManagedStoresLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/stores/managed`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error(`Unable to load stores (${response.status})`)
        const payload = (await response.json()) as { items?: ManagedStoreOption[] }
        if (mounted) setManagedStores(payload.items ?? [])
      } catch {
        if (mounted) setManagedStores([])
      } finally {
        if (mounted) setIsManagedStoresLoading(false)
      }
    }
    void loadManaged()
    return () => {
      mounted = false
    }
  }, [activeFeature, dashboardApiReady])

  useEffect(() => {
    if (activeFeature !== 'products') {
      setIsProductFormOpen(false)
      setEditingProduct(null)
      setConfirmDeleteProduct(null)
      setProductForm({
        sku: '',
        name: '',
        description: '',
        basePrice: '',
        status: 'active',
        isClearance: false,
        isRefurbished: false,
        level1Id: 'none',
        level2Id: 'none',
        level3Id: 'none',
        imageS3Keys: [],
        videoUrls: [],
        storeIds: [],
        storeQuantities: {},
      })
    }
  }, [activeFeature])

  const level1Options = useMemo(() => productCategoriesTree.filter((item) => item.level === 1), [productCategoriesTree])
  const level2Options = useMemo(
    () => productCategoriesTree.filter((item) => item.level === 2 && item.parentId === productForm.level1Id),
    [productCategoriesTree, productForm.level1Id],
  )
  const level3Options = useMemo(
    () => productCategoriesTree.filter((item) => item.level === 3 && item.parentId === productForm.level2Id),
    [productCategoriesTree, productForm.level2Id],
  )

  const resetProductForm = () => {
    setProductForm({
      sku: '',
      name: '',
      description: '',
      basePrice: '',
      status: 'active',
      isClearance: false,
      isRefurbished: false,
      level1Id: 'none',
      level2Id: 'none',
      level3Id: 'none',
      imageS3Keys: [],
      videoUrls: [],
      storeIds: [],
      storeQuantities: {},
    })
  }

  const closeProductForm = () => {
    setIsProductFormOpen(false)
    setEditingProduct(null)
    setUploadingImageIndexes({})
    resetProductForm()
  }

  const openCreateProductForm = () => {
    setEditingProduct(null)
    setIsProductFormOpen(true)
    setInlineStatusMessage(null)
    const defaultStoreIds = managedStores.map((m) => m.id)
    setProductForm({
      sku: '',
      name: '',
      description: '',
      basePrice: '',
      status: 'active',
      isClearance: false,
      isRefurbished: false,
      level1Id: 'none',
      level2Id: 'none',
      level3Id: 'none',
      imageS3Keys: [],
      videoUrls: [],
      storeIds: defaultStoreIds,
      storeQuantities: storeQuantitiesForIds(defaultStoreIds, null),
    })
  }

  const toggleProductStoreId = (storeId: string) => {
    setProductForm((prev) => {
      const set = new Set(prev.storeIds)
      const nextQs = { ...prev.storeQuantities }
      if (set.has(storeId)) {
        set.delete(storeId)
        delete nextQs[storeId]
      } else {
        set.add(storeId)
        nextQs[storeId] = nextQs[storeId] ?? '0'
      }
      return { ...prev, storeIds: [...set], storeQuantities: nextQs }
    })
  }

  const selectAllManagedStores = () => {
    setProductForm((prev) => {
      const ids = managedStores.map((m) => m.id)
      const nextQs = { ...prev.storeQuantities }
      ids.forEach((id) => {
        if (nextQs[id] === undefined) nextQs[id] = '0'
      })
      Object.keys(nextQs).forEach((k) => {
        if (!ids.includes(k)) delete nextQs[k]
      })
      return { ...prev, storeIds: ids, storeQuantities: nextQs }
    })
  }

  const setProductStoreQuantity = (storeId: string, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      storeQuantities: { ...prev.storeQuantities, [storeId]: value },
    }))
  }

  const openEditProductForm = async (product: ProductItem) => {
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/${product.id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error(`Unable to load product detail (${response.status})`)

      const detail = (await response.json()) as ProductDetail
      const level3 = productCategoriesTree.find((item) => item.id === (detail.categoryId ?? ''))
      const level2 = level3 ? productCategoriesTree.find((item) => item.id === (level3.parentId ?? '')) : undefined
      const level1 = level2 ? productCategoriesTree.find((item) => item.id === (level2.parentId ?? '')) : undefined

      setEditingProduct(detail)
      setIsProductFormOpen(true)
      const ids = (detail.storeIds ?? []).map(String)
      setProductForm({
        sku: detail.sku,
        name: detail.name,
        description: detail.description ?? '',
        basePrice: String(detail.basePrice),
        status: detail.status,
        isClearance: Boolean(detail.isClearance),
        isRefurbished: Boolean(detail.isRefurbished),
        level1Id: level1?.id ?? 'none',
        level2Id: level2?.id ?? 'none',
        level3Id: level3?.id ?? 'none',
        imageS3Keys: detail.imageS3Keys,
        videoUrls: detail.videoUrls,
        storeIds: ids,
        storeQuantities: storeQuantitiesForIds(ids, detail),
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to open product edit form.')
    }
  }

  const handleProductImageFile = async (index: number, file: File) => {
    setUploadingImageIndexes((prev) => ({ ...prev, [index]: true }))
    setInlineStatusMessage(null)
    try {
      const result = await uploadProductImage(file, editingProduct?.id ?? null)
      setProductForm((prev) => {
        const nextKeys = [...prev.imageS3Keys]
        while (nextKeys.length <= index) {
          nextKeys.push('')
        }
        nextKeys[index] = result.blobKey
        return { ...prev, imageS3Keys: nextKeys }
      })
      if (result.publicUrl.endsWith(result.blobKey)) {
        const base = result.publicUrl.slice(0, -(result.blobKey.length + 1))
        setProductMediaBaseUrl((prev) => prev ?? base)
      }
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to upload image.')
    } finally {
      setUploadingImageIndexes((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  const handleRemoveProductImage = async (index: number) => {
    const key = productForm.imageS3Keys[index]?.trim() ?? ''
    if (key && isStagingBlobKey(key)) {
      try {
        await deleteProductImage(key)
      } catch (error) {
        setInlineStatusType('error')
        setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to delete image from storage.')
        return
      }
    }

    setProductForm((prev) => ({
      ...prev,
      imageS3Keys: prev.imageS3Keys.filter((_, idx) => idx !== index),
    }))
    setUploadingImageIndexes((prev) => {
      const next: Record<number, boolean> = {}
      Object.entries(prev).forEach(([idx, value]) => {
        const i = Number(idx)
        if (i < index) next[i] = value
        else if (i > index) next[i - 1] = value
      })
      return next
    })
  }

  const isProductImageUploading = Object.values(uploadingImageIndexes).some(Boolean)

  const handleProductVideoChange = (index: number, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      videoUrls: prev.videoUrls.map((item, idx) => (idx === index ? value : item)),
    }))
  }

  const handleSaveProduct = async () => {
    const hasProductChanges = computeHasProductChanges(editingProduct, productForm)
    if (!hasProductChanges) return
    if (isProductImageUploading) {
      setInlineStatusType('info')
      setInlineStatusMessage('Wait for photo uploads to finish before saving.')
      return
    }

    setIsProductSaving(true)
    setInlineStatusMessage(null)
    try {
      await executeProductUpsert({
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
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to save product.')
    } finally {
      setIsProductSaving(false)
    }
  }

  const handleDeleteProduct = async (product: ProductItem) => {
    setIsProductDeleting(true)
    setDeletingProductId(product.id)
    setInlineStatusMessage(null)
    try {
      await executeProductSoftDelete({
        setProductsState,
        setConfirmDeleteProduct,
        setEditingProduct,
        setIsProductFormOpen,
        setInlineStatusType,
        setInlineStatusMessage,
        editingProduct,
        product,
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to delete product.')
    } finally {
      setIsProductDeleting(false)
      setDeletingProductId(null)
    }
  }

  return {
    isProductFormOpen,
    editingProduct,
    confirmDeleteProduct,
    setConfirmDeleteProduct,
    isProductSaving,
    isProductDeleting,
    deletingProductId,
    productForm,
    setProductForm,
    level1Options,
    level2Options,
    level3Options,
    managedStores,
    isManagedStoresLoading,
    isAdminUser,
    toggleProductStoreId,
    selectAllManagedStores,
    setProductStoreQuantity,
    closeProductForm,
    openCreateProductForm,
    openEditProductForm,
    handleProductImageFile,
    handleRemoveProductImage,
    uploadingImageIndexes,
    isProductImageUploading,
    productMediaBaseUrl,
    handleProductVideoChange,
    handleSaveProduct,
    handleDeleteProduct,
  }
}
