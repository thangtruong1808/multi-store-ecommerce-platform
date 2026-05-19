import type { Dispatch, SetStateAction } from 'react'

import type { DashboardFeatureKey, ManagedStoreOption } from '../dashboardTypes'
import { useDashboardVouchersForm } from './useDashboardVouchersForm'
import { useDashboardVouchersList } from './useDashboardVouchersList'

export function useDashboardVouchersBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  managedStores: ManagedStoreOption[],
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const list = useDashboardVouchersList(activeFeature, page, pageSize, dashboardApiReady)
  const form = useDashboardVouchersForm(
    activeFeature,
    list,
    managedStores,
    setInlineStatusMessage,
    setInlineStatusType,
  )
  return { ...list, ...form }
}
