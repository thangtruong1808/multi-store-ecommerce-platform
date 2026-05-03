import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { DashboardFeatureKey, StoresResponse } from '../dashboardTypes'

export function useDashboardStoresList(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  dashboardApiReady: boolean,
) {
  const [storesState, setStoresState] = useState<StoresResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isStoresLoading, setIsStoresLoading] = useState(false)
  const [storesError, setStoresError] = useState<string | null>(null)
  const [storeSearchText, setStoreSearchText] = useState('')
  const [storeSearchInput, setStoreSearchInput] = useState('')

  useEffect(() => {
    if (activeFeature !== 'stores') return
    if (!dashboardApiReady) {
      setIsStoresLoading(true)
      return () => setIsStoresLoading(false)
    }
    let isMounted = true
    const loadStores = async () => {
      setIsStoresLoading(true)
      setStoresError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (storeSearchText.trim()) query.set('q', storeSearchText.trim())

        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/stores?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error(`Unable to load stores (${response.status})`)
        const payload = (await response.json()) as StoresResponse
        if (isMounted) {
          setStoresState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted)
          setStoresError(error instanceof Error ? error.message : 'Unable to load stores')
      } finally {
        if (isMounted) setIsStoresLoading(false)
      }
    }
    void loadStores()
    return () => {
      isMounted = false
    }
  }, [activeFeature, dashboardApiReady, page, pageSize, storeSearchText])

  return {
    storesState,
    setStoresState,
    isStoresLoading,
    storesError,
    storeSearchText,
    setStoreSearchText,
    storeSearchInput,
    setStoreSearchInput,
  }
}
