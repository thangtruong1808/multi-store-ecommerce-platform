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
} from '../dashboardDerivedFlags'
import { deriveDashboardPagination } from '../dashboardPaginationUtils'
import type { DashboardFeatureKey } from '../dashboardTypes'
import { useDashboardCategoriesBlock } from './useDashboardCategoriesBlock'
import { invalidateDashboardSession } from '../fetchDashboardApi'
import { useDashboardChrome } from './useDashboardChrome'
import { useDashboardProductsBlock } from './useDashboardProductsBlock'
import { useDashboardStoresBlock } from './useDashboardStoresBlock'
import { useDashboardUsersBlock } from './useDashboardUsersBlock'

export function useDashboardModel() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, isLoading, isHydrated, user } = useAppSelector((state) => state.auth)

  const [activeFeature, setActiveFeature] = useState<DashboardFeatureKey>('users')
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
    users.activityLogsError

  return {
    isAuthenticated,
    actionLoading,
    isLoading,
    isHydrated,
    fullName,
    userRole: user?.role ?? 'unknown',

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

    hasEditChanges,
    hasCategoryChanges,
    hasProductChanges,
    hasStoreChanges,

    handleLogout,
  }
}

export type DashboardModel = ReturnType<typeof useDashboardModel>
