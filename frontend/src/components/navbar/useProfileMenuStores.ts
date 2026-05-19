import { useEffect, useMemo, useState } from 'react'

import { API_BASE_URL } from '../../features/auth/authConstants'
import { refreshAccessToken } from '../../features/auth/refreshAccessToken'

type ManagedStoreRow = {
  id: string
  name: string
}

export function shouldShowStoreLocation(role?: string): boolean {
  return role === 'admin' || role === 'store_manager' || role === 'staff'
}

export function useProfileMenuStores(isOpen: boolean, role?: string) {
  const showStoreLocation = shouldShowStoreLocation(role)
  const [stores, setStores] = useState<ManagedStoreRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !showStoreLocation) {
      setStores([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const url = `${API_BASE_URL}/api/stores/managed`
        const go = () =>
          fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })

        let response = await go()
        if (response.status === 401) {
          const refreshed = await refreshAccessToken()
          if (refreshed) {
            response = await go()
          }
        }

        if (!response.ok) {
          throw new Error('Unable to load store locations.')
        }

        const payload = (await response.json()) as { items?: ManagedStoreRow[] }
        if (!cancelled) {
          setStores(payload.items ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          setStores([])
          setError(err instanceof Error ? err.message : 'Unable to load store locations.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isOpen, showStoreLocation])

  const storeLocationLabel = useMemo(() => {
    if (!showStoreLocation) {
      return null
    }
    if (error) {
      return 'Unavailable'
    }
    if (stores.length === 0) {
      if (role === 'admin') {
        return 'No stores configured'
      }
      return 'Not assigned'
    }
    if (role === 'admin' && stores.length > 1) {
      return `All stores (${stores.length})`
    }
    return stores.map((store) => store.name).join(', ')
  }, [error, role, showStoreLocation, stores])

  return {
    showStoreLocation,
    storeLocationLabel,
    isStoreLocationLoading: isLoading,
  }
}
