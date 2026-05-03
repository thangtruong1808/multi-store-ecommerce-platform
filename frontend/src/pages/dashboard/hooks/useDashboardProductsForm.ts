import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { API_BASE_URL } from '../../../features/auth/authConstants'
import { executeProductSoftDelete } from '../products/executeProductDelete'
import { executeProductUpsert } from '../products/executeProductUpsert'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
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
  })

  const [managedStores, setManagedStores] = useState<ManagedStoreOption[]>([])
  const [isManagedStoresLoading, setIsManagedStoresLoading] = useState(false)

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
    })
  }

  const closeProductForm = () => {
    setIsProductFormOpen(false)
    setEditingProduct(null)
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
    })
  }

  const toggleProductStoreId = (storeId: string) => {
    setProductForm((prev) => {
      const set = new Set(prev.storeIds)
      if (set.has(storeId)) set.delete(storeId)
      else set.add(storeId)
      return { ...prev, storeIds: [...set] }
    })
  }

  const selectAllManagedStores = () => {
    setProductForm((prev) => ({
      ...prev,
      storeIds: managedStores.map((m) => m.id),
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
        storeIds: (detail.storeIds ?? []).map(String),
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to open product edit form.')
    }
  }

  const handleProductImageChange = (index: number, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      imageS3Keys: prev.imageS3Keys.map((item, idx) => (idx === index ? value : item)),
    }))
  }

  const handleProductVideoChange = (index: number, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      videoUrls: prev.videoUrls.map((item, idx) => (idx === index ? value : item)),
    }))
  }

  const handleSaveProduct = async () => {
    const hasProductChanges = computeHasProductChanges(editingProduct, productForm)
    if (!hasProductChanges) return

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
    closeProductForm,
    openCreateProductForm,
    openEditProductForm,
    handleProductImageChange,
    handleProductVideoChange,
    handleSaveProduct,
    handleDeleteProduct,
  }
}
