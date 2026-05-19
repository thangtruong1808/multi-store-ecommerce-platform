import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { DashboardFeatureKey, DashboardStatistics } from '../dashboardTypes'

export type OverviewStoreFilter = 'all' | string

const PERIOD_OPTIONS = [7, 30, 90] as const
export type OverviewPeriodDays = (typeof PERIOD_OPTIONS)[number]

export function useDashboardOverviewBlock(
  activeFeature: DashboardFeatureKey,
  dashboardApiReady: boolean,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
) {
  const isAdminSession = useAppSelector((state) => state.auth.user?.role === 'admin')

  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null)
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<OverviewStoreFilter>('all')
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<OverviewPeriodDays>(30)

  const loadStatistics = useCallback(async () => {
    if (!dashboardApiReady) {
      return
    }

    setIsStatisticsLoading(true)
    setStatisticsError(null)
    try {
      const params = new URLSearchParams({ days: String(selectedPeriodDays) })
      if (isAdminSession && selectedStoreId !== 'all') {
        params.set('storeId', selectedStoreId)
      }

      const response = await fetchWithAutoRefresh(
        `${API_BASE_URL}/api/dashboard/statistics?${params.toString()}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      )

      if (!response.ok) {
        throw new Error(`Unable to load statistics (${response.status})`)
      }

      const payload = (await response.json()) as {
        storeId?: string | null
        storeName?: string | null
        periodDays?: number
        currencyCode?: string
        revenuePaid?: number
        orderCount?: number
        paidOrderCount?: number
        pendingPaymentCount?: number
        averageOrderValue?: number
        activeProductCount?: number
        lowStockCount?: number
        revenueByDay?: Array<{ date: string; revenue: number; orderCount: number }>
        paymentStatusBreakdown?: Array<{ status: string; label: string; count: number }>
        topProducts?: Array<{ productName: string; unitsSold: number; revenue: number }>
        uniqueCustomersTotal?: number
        customersPerStore?: Array<{
          storeId: string
          storeName: string
          uniqueCustomers: number
          paidOrderCount: number
        }>
      }

      setInlineStatusMessage(null)

      setStatistics({
        storeId: payload.storeId ?? null,
        storeName: payload.storeName ?? null,
        periodDays: payload.periodDays ?? selectedPeriodDays,
        currencyCode: payload.currencyCode ?? 'AUD',
        revenuePaid: Number(payload.revenuePaid ?? 0),
        orderCount: payload.orderCount ?? 0,
        paidOrderCount: payload.paidOrderCount ?? 0,
        pendingPaymentCount: payload.pendingPaymentCount ?? 0,
        averageOrderValue: Number(payload.averageOrderValue ?? 0),
        activeProductCount: payload.activeProductCount ?? 0,
        lowStockCount: payload.lowStockCount ?? 0,
        revenueByDay: (payload.revenueByDay ?? []).map((point) => ({
          date: point.date,
          revenue: Number(point.revenue ?? 0),
          orderCount: point.orderCount ?? 0,
        })),
        paymentStatusBreakdown: (payload.paymentStatusBreakdown ?? []).map((slice) => ({
          status: slice.status,
          label: slice.label,
          count: slice.count ?? 0,
        })),
        topProducts: (payload.topProducts ?? []).map((product) => ({
          productName: product.productName,
          unitsSold: product.unitsSold ?? 0,
          revenue: Number(product.revenue ?? 0),
        })),
        uniqueCustomersTotal: payload.uniqueCustomersTotal ?? 0,
        customersPerStore: (payload.customersPerStore ?? []).map((row) => ({
          storeId: row.storeId,
          storeName: row.storeName,
          uniqueCustomers: row.uniqueCustomers ?? 0,
          paidOrderCount: row.paidOrderCount ?? 0,
        })),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load statistics'
      setStatisticsError(message)
      setStatistics(null)
      setInlineStatusMessage(message)
      setInlineStatusType('error')
    } finally {
      setIsStatisticsLoading(false)
    }
  }, [
    dashboardApiReady,
    isAdminSession,
    selectedPeriodDays,
    selectedStoreId,
    setInlineStatusMessage,
    setInlineStatusType,
  ])

  useEffect(() => {
    if (activeFeature !== 'overview') {
      return
    }

    if (!dashboardApiReady) {
      setIsStatisticsLoading(true)
      return () => setIsStatisticsLoading(false)
    }

    void loadStatistics()
  }, [activeFeature, dashboardApiReady, loadStatistics])

  return {
    isAdminSession,
    statistics,
    isStatisticsLoading,
    statisticsError,
    selectedStoreId,
    setSelectedStoreId,
    selectedPeriodDays,
    setSelectedPeriodDays,
    periodOptions: PERIOD_OPTIONS,
    reloadStatistics: loadStatistics,
  }
}
