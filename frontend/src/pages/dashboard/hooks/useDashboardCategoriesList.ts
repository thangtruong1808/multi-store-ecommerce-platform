import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type {
  CategoriesResponse,
  CategoryParentOption,
  DashboardFeatureKey,
} from '../dashboardTypes'

export function useDashboardCategoriesList(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  dashboardApiReady: boolean,
) {
  const [categoriesState, setCategoriesState] = useState<CategoriesResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryFilterLevel, setCategoryFilterLevel] = useState<'all' | '1' | '2' | '3'>('all')
  const [categoryFilterParentId, setCategoryFilterParentId] = useState<'all' | string>('all')
  const [categorySearchText, setCategorySearchText] = useState('')
  const [categorySearchInput, setCategorySearchInput] = useState('')
  const [categoryParentOptions, setCategoryParentOptions] = useState<CategoryParentOption[]>([])
  const [isCategoryParentsLoading, setIsCategoryParentsLoading] = useState(false)

  useEffect(() => {
    if (activeFeature !== 'categories') return
    if (!dashboardApiReady) {
      setIsCategoriesLoading(true)
      return () => setIsCategoriesLoading(false)
    }
    let isMounted = true
    const loadCategories = async () => {
      setIsCategoriesLoading(true)
      setCategoriesError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (categoryFilterLevel !== 'all') query.set('level', categoryFilterLevel)
        if (categoryFilterParentId !== 'all') query.set('parentId', categoryFilterParentId)
        if (categorySearchText.trim()) query.set('q', categorySearchText.trim())

        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error(`Unable to load categories (${response.status})`)
        const payload = (await response.json()) as CategoriesResponse
        if (isMounted) {
          setCategoriesState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted)
          setCategoriesError(error instanceof Error ? error.message : 'Unable to load categories')
      } finally {
        if (isMounted) setIsCategoriesLoading(false)
      }
    }
    void loadCategories()
    return () => {
      isMounted = false
    }
  }, [
    activeFeature,
    dashboardApiReady,
    page,
    pageSize,
    categoryFilterLevel,
    categoryFilterParentId,
    categorySearchText,
  ])

  useEffect(() => {
    if (activeFeature !== 'categories') return
    if (categoryFilterLevel === 'all' || categoryFilterLevel === '1') {
      setCategoryParentOptions([])
      setCategoryFilterParentId('all')
      return
    }
    if (!dashboardApiReady) {
      setIsCategoryParentsLoading(true)
      return () => setIsCategoryParentsLoading(false)
    }
    let isMounted = true
    const loadParents = async () => {
      setIsCategoryParentsLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/parents?level=${categoryFilterLevel}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Unable to load category parents')
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) {
          setCategoryParentOptions(payload.items ?? [])
          if (
            categoryFilterParentId !== 'all' &&
            !(payload.items ?? []).some((item) => item.id === categoryFilterParentId)
          ) {
            setCategoryFilterParentId('all')
          }
        }
      } finally {
        if (isMounted) setIsCategoryParentsLoading(false)
      }
    }
    void loadParents()
    return () => {
      isMounted = false
    }
  }, [activeFeature, categoryFilterLevel, categoryFilterParentId, dashboardApiReady])

  return {
    categoriesState,
    setCategoriesState,
    isCategoriesLoading,
    categoriesError,
    categoryFilterLevel,
    setCategoryFilterLevel,
    categoryFilterParentId,
    setCategoryFilterParentId,
    categorySearchText,
    setCategorySearchText,
    categorySearchInput,
    setCategorySearchInput,
    categoryParentOptions,
    isCategoryParentsLoading,
  }
}
