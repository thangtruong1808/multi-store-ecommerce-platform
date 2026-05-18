import { useEffect, useMemo, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { ManagedStoreOption } from '../dashboardTypes'

type ManagedStoresResponse = {
  items?: ManagedStoreOption[]
}

export function useDashboardSessionStores(dashboardApiReady: boolean) {
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const [stores, setStores] = useState<ManagedStoreOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dashboardApiReady) {
      setIsLoading(true)
      return () => setIsLoading(false)
    }

    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/stores/managed`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load store locations (${response.status})`)
        }
        const payload = (await response.json()) as ManagedStoresResponse
        if (mounted) {
          setStores(payload.items ?? [])
        }
      } catch (err) {
        if (mounted) {
          setStores([])
          setError(err instanceof Error ? err.message : 'Unable to load store locations.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [dashboardApiReady])

  const storeLocationLabel = useMemo(() => {
    if (error) {
      return 'Unavailable'
    }

    if (stores.length === 0) {
      if (userRole === 'admin') {
        return 'No stores configured'
      }
      if (userRole === 'store_manager' || userRole === 'staff') {
        return 'Not assigned'
      }
      return '—'
    }

    if (userRole === 'admin' && stores.length > 1) {
      return `All stores (${stores.length})`
    }

    return stores.map((store) => store.name).join(', ')
  }, [error, stores, userRole])

  return {
    storeLocationLabel,
    isStoreLocationLoading: isLoading,
    storeLocationError: error,
  }
}
