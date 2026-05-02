import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { CategoryParentOption, DashboardFeatureKey, ProductsResponse } from '../dashboardTypes'

export function useDashboardProductsList(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  dashboardApiReady: boolean,
) {
  const [productsState, setProductsState] = useState<ProductsResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productFilterStatus, setProductFilterStatus] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')
  const [productFilterCategoryId, setProductFilterCategoryId] = useState<'all' | string>('all')
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchInput, setProductSearchInput] = useState('')
  const [productCategoriesTree, setProductCategoriesTree] = useState<CategoryParentOption[]>([])
  const [isProductCategoriesLoading, setIsProductCategoriesLoading] = useState(false)

  useEffect(() => {
    if (activeFeature !== 'products') return
    if (!dashboardApiReady) {
      setIsProductsLoading(true)
      return () => setIsProductsLoading(false)
    }
    let isMounted = true
    const loadProducts = async () => {
      setIsProductsLoading(true)
      setProductsError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (productFilterStatus !== 'all') query.set('status', productFilterStatus)
        if (productFilterCategoryId !== 'all') query.set('categoryId', productFilterCategoryId)
        if (productSearchText.trim()) query.set('q', productSearchText.trim())

        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error(`Unable to load products (${response.status})`)
        const payload = (await response.json()) as ProductsResponse
        if (isMounted) {
          setProductsState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) setProductsError(error instanceof Error ? error.message : 'Unable to load products')
      } finally {
        if (isMounted) setIsProductsLoading(false)
      }
    }
    void loadProducts()
    return () => {
      isMounted = false
    }
  }, [
    activeFeature,
    dashboardApiReady,
    page,
    pageSize,
    productFilterStatus,
    productFilterCategoryId,
    productSearchText,
  ])

  useEffect(() => {
    if (activeFeature !== 'products') return
    if (!dashboardApiReady) {
      setIsProductCategoriesLoading(true)
      return () => setIsProductCategoriesLoading(false)
    }
    let isMounted = true
    const loadCategoryTree = async () => {
      setIsProductCategoriesLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/categories/tree`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Unable to load product categories.')
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) setProductCategoriesTree(payload.items ?? [])
      } catch (error) {
        if (isMounted) setProductsError(error instanceof Error ? error.message : 'Unable to load product categories')
      } finally {
        if (isMounted) setIsProductCategoriesLoading(false)
      }
    }
    void loadCategoryTree()
    return () => {
      isMounted = false
    }
  }, [activeFeature, dashboardApiReady])

  return {
    productsState,
    setProductsState,
    isProductsLoading,
    productsError,
    productFilterStatus,
    setProductFilterStatus,
    productFilterCategoryId,
    setProductFilterCategoryId,
    productSearchText,
    setProductSearchText,
    productSearchInput,
    setProductSearchInput,
    productCategoriesTree,
    isProductCategoriesLoading,
  }
}
