import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { DashboardFeatureKey, VouchersResponse } from '../dashboardTypes'

export function useDashboardVouchersList(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  dashboardApiReady: boolean,
) {
  const [vouchersState, setVouchersState] = useState<VouchersResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isVouchersLoading, setIsVouchersLoading] = useState(false)
  const [vouchersError, setVouchersError] = useState<string | null>(null)
  const [voucherSearchText, setVoucherSearchText] = useState('')
  const [voucherSearchInput, setVoucherSearchInput] = useState('')
  const [voucherFilterStatus, setVoucherFilterStatus] = useState<
    'all' | 'Active' | 'Expired' | 'Scheduled' | 'Inactive' | 'Exhausted'
  >('all')
  const [voucherFilterStoreId, setVoucherFilterStoreId] = useState<'all' | string>('all')

  useEffect(() => {
    if (activeFeature !== 'vouchers') return
    if (!dashboardApiReady) {
      setIsVouchersLoading(true)
      return () => setIsVouchersLoading(false)
    }

    let isMounted = true
    const load = async () => {
      setIsVouchersLoading(true)
      setVouchersError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (voucherSearchText.trim()) query.set('q', voucherSearchText.trim())
        if (voucherFilterStatus !== 'all') query.set('status', voucherFilterStatus)
        if (voucherFilterStoreId !== 'all') query.set('storeId', voucherFilterStoreId)

        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/vouchers?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null
          throw new Error(body?.message ?? `Unable to load vouchers (${response.status})`)
        }
        const payload = (await response.json()) as VouchersResponse
        if (isMounted) {
          setVouchersState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          setVouchersError(error instanceof Error ? error.message : 'Unable to load vouchers')
        }
      } finally {
        if (isMounted) setIsVouchersLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [
    activeFeature,
    dashboardApiReady,
    page,
    pageSize,
    voucherSearchText,
    voucherFilterStatus,
    voucherFilterStoreId,
  ])

  return {
    vouchersState,
    setVouchersState,
    isVouchersLoading,
    vouchersError,
    voucherSearchText,
    setVoucherSearchText,
    voucherSearchInput,
    setVoucherSearchInput,
    voucherFilterStatus,
    setVoucherFilterStatus,
    voucherFilterStoreId,
    setVoucherFilterStoreId,
  }
}
