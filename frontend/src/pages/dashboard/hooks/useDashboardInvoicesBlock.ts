import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type { DashboardFeatureKey, InvoiceItem, InvoicesResponse } from '../dashboardTypes'

export function useDashboardInvoicesBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const [invoicesState, setInvoicesState] = useState<InvoicesResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)

  useEffect(() => {
    if (activeFeature !== 'invoices') {
      return
    }

    if (!dashboardApiReady) {
      setIsInvoicesLoading(true)
      return () => setIsInvoicesLoading(false)
    }

    let isMounted = true
    const loadInvoices = async () => {
      setIsInvoicesLoading(true)
      setInvoicesError(null)
      try {
        const response = await fetchWithAutoRefresh(
          `${API_BASE_URL}/api/dashboard/invoices?page=${page}&pageSize=${pageSize}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        )
        if (!response.ok) {
          throw new Error(`Unable to load invoices (${response.status})`)
        }

        const payload = (await response.json()) as {
          items?: Array<{
            id: string
            orderNumber: string
            grandTotal: number
            currencyCode: string
            paymentStatus: string
            paymentStatusLabel: string
            placedAt: string
            customerEmail: string
            storeName?: string | null
          }>
          page?: number
          pageSize?: number
          totalItems?: number
          totalPages?: number
        }

        const items: InvoiceItem[] = (payload.items ?? []).map((row) => ({
          id: row.id,
          orderNumber: row.orderNumber,
          grandTotal: Number(row.grandTotal),
          currencyCode: row.currencyCode,
          paymentStatus: row.paymentStatus,
          paymentStatusLabel: row.paymentStatusLabel,
          placedAt: row.placedAt,
          customerEmail: row.customerEmail,
          storeName: row.storeName ?? null,
        }))

        if (isMounted) {
          setInvoicesState({
            items,
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Unable to load invoices'
          setInvoicesError(message)
          setInlineStatusMessage(message)
          setInlineStatusType('error')
        }
      } finally {
        if (isMounted) {
          setIsInvoicesLoading(false)
        }
      }
    }

    void loadInvoices()
    return () => {
      isMounted = false
    }
  }, [activeFeature, dashboardApiReady, page, pageSize, setInlineStatusMessage, setInlineStatusType])

  return {
    invoicesState,
    isInvoicesLoading,
    invoicesError,
  }
}
