import type { Dispatch, SetStateAction } from 'react'

import type { DashboardFeatureKey } from '../dashboardTypes'
import { useDashboardProductsForm } from './useDashboardProductsForm'
import { useDashboardProductsList } from './useDashboardProductsList'

export function useDashboardProductsBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  setPage: Dispatch<SetStateAction<number>>,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const list = useDashboardProductsList(activeFeature, page, pageSize, setPage, dashboardApiReady)
  const form = useDashboardProductsForm(
    activeFeature,
    pageSize,
    list,
    setInlineStatusMessage,
    setInlineStatusType,
    dashboardApiReady,
  )
  return { ...list, ...form }
}
