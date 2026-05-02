import type { Dispatch, SetStateAction } from 'react'

import type { DashboardFeatureKey } from '../dashboardTypes'
import { useDashboardCategoriesForm } from './useDashboardCategoriesForm'
import { useDashboardCategoriesList } from './useDashboardCategoriesList'

export function useDashboardCategoriesBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const list = useDashboardCategoriesList(activeFeature, page, pageSize, dashboardApiReady)
  const form = useDashboardCategoriesForm(activeFeature, list, setInlineStatusMessage, setInlineStatusType)
  return { ...list, ...form }
}
