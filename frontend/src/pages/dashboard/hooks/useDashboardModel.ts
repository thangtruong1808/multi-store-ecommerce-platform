import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { logoutUser } from '../../../features/auth/authSlice'
import { refreshAccessTokenResult } from '../../../features/auth/refreshAccessToken'
import {
  computeHasCategoryChanges,
  computeHasEditChanges,
  computeHasProductChanges,
  computeHasStoreChanges,
  computeHasVoucherChanges,
} from '../dashboardDerivedFlags'
import { deriveDashboardPagination } from '../dashboardPaginationUtils'
import type { DashboardFeatureKey } from '../dashboardTypes'
import { useDashboardCategoriesBlock } from './useDashboardCategoriesBlock'
import { invalidateDashboardSession } from '../fetchDashboardApi'
import { useDashboardChrome } from './useDashboardChrome'
import { useDashboardProductsBlock } from './useDashboardProductsBlock'
import { useDashboardStoresBlock } from './useDashboardStoresBlock'
import { useDashboardSessionStores } from './useDashboardSessionStores'
import { useDashboardInvoicesBlock } from './useDashboardInvoicesBlock'
import { useDashboardOverviewBlock } from './useDashboardOverviewBlock'
import { useDashboardUsersBlock } from './useDashboardUsersBlock'
import { useDashboardVouchersBlock } from './useDashboardVouchersBlock'

export function useDashboardModel() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, isLoading, isHydrated, user } = useAppSelector((state) => state.auth)

  const [activeFeature, setActiveFeature] = useState<DashboardFeatureKey>('overview')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [dashboardApiReady, setDashboardApiReady] = useState(false)

  useEffect(() => {
    let alive = true
    void refreshAccessTokenResult().then((r) => {
      if (!alive) return
      if (!r.ok && r.sessionInvalid) {
        invalidateDashboardSession()
        return
      }
      setDashboardApiReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const chrome = useDashboardChrome(navigate, activeFeature, pageSize, setPage)
  const sessionStores = useDashboardSessionStores(dashboardApiReady)

  const categories = useDashboardCategoriesBlock(
    activeFeature,
    page,
    pageSize,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const products = useDashboardProductsBlock(
    activeFeature,
    page,
    pageSize,
    setPage,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const stores = useDashboardStoresBlock(
    activeFeature,
    page,
    pageSize,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const users = useDashboardUsersBlock(
    activeFeature,
    page,
    pageSize,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const invoices = useDashboardInvoicesBlock(
    activeFeature,
    page,
    pageSize,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const overview = useDashboardOverviewBlock(
    activeFeature,
    dashboardApiReady,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
  )

  const vouchers = useDashboardVouchersBlock(
    activeFeature,
    page,
    pageSize,
    sessionStores.managedStores,
    chrome.setInlineStatusMessage,
    chrome.setInlineStatusType,
    dashboardApiReady,
  )

  const pagination = useMemo(
    () =>
      deriveDashboardPagination({
        activeFeature,
        page,
        pageSize,
        usersState: users.usersState,
        storesState: stores.storesState,
        categoriesState: categories.categoriesState,
        productsState: products.productsState,
        activityLogsState: users.activityLogsState,
        invoicesState: invoices.invoicesState,
        vouchersState: vouchers.vouchersState,
      }),
    [
      activeFeature,
      page,
      pageSize,
      users.usersState,
      stores.storesState,
      categories.categoriesState,
      products.productsState,
      users.activityLogsState,
      invoices.invoicesState,
      vouchers.vouchersState,
    ],
  )

  const hasEditChanges = useMemo(
    () => computeHasEditChanges(users.editingUser, users.editForm, users.baselineManagedStoreIds),
    [users.editingUser, users.editForm, users.baselineManagedStoreIds],
  )
  const hasCategoryChanges = useMemo(
    () => computeHasCategoryChanges(categories.editingCategory, categories.categoryForm),
    [categories.editingCategory, categories.categoryForm],
  )
  const hasProductChanges = useMemo(
    () => computeHasProductChanges(products.editingProduct, products.productForm),
    [products.editingProduct, products.productForm],
  )
  const hasStoreChanges = useMemo(
    () => computeHasStoreChanges(stores.editingStore, stores.storeForm),
    [stores.editingStore, stores.storeForm],
  )
  const hasVoucherChanges = useMemo(
    () => computeHasVoucherChanges(vouchers.editingVoucher, vouchers.voucherForm),
    [vouchers.editingVoucher, vouchers.voucherForm],
  )

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Unknown user',
    [user?.firstName, user?.lastName],
  )

  const handleLogout = async () => {
    const result = await dispatch(logoutUser())
    if (logoutUser.fulfilled.match(result)) {
      navigate('/signin', { replace: true })
    }
  }

  const aggregateError =
    users.usersError ??
    stores.storesError ??
    categories.categoriesError ??
    products.productsError ??
    users.activityLogsError ??
    invoices.invoicesError ??
    vouchers.vouchersError ??
    overview.statisticsError

  return {
    isAuthenticated,
    actionLoading,
    isLoading,
    isHydrated,
    fullName,
    userRole: user?.role ?? 'unknown',
    managedStores: sessionStores.managedStores,
    storeLocationLabel: sessionStores.storeLocationLabel,
    isStoreLocationLoading: sessionStores.isStoreLocationLoading,

    activeFeature,
    setActiveFeature,
    pageSize,
    setPageSize,
    page,
    setPage,

    ...chrome,
    ...pagination,

    aggregateError,

    categories,
    products,
    stores,
    users,
    invoices,
    overview,
    vouchers,

    hasEditChanges,
    hasCategoryChanges,
    hasProductChanges,
    hasStoreChanges,
    hasVoucherChanges,

    handleLogout,
  }
}

export type DashboardModel = ReturnType<typeof useDashboardModel>
