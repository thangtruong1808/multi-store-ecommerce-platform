import type { Dispatch, SetStateAction } from 'react'

import type { DashboardFeatureKey } from '../dashboardTypes'
import { useDashboardStoresForm } from './useDashboardStoresForm'
import { useDashboardStoresList } from './useDashboardStoresList'

export function useDashboardStoresBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const list = useDashboardStoresList(activeFeature, page, pageSize, dashboardApiReady)
  const form = useDashboardStoresForm(activeFeature, list, setInlineStatusMessage, setInlineStatusType)
  return { ...list, ...form }
}
