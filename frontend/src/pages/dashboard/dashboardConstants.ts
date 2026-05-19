import {
  FiActivity,
  FiBarChart2,
  FiFileText,
  FiGift,
  FiPackage,
  FiShoppingBag,
  FiTag,
  FiUsers,
} from 'react-icons/fi'

import type { DashboardFeatureKey, SidebarItem } from './dashboardTypes'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export const sideBarItems: SidebarItem[] = [
  { key: 'overview', label: 'Overview', icon: FiBarChart2 },
  { key: 'users', label: 'Users', icon: FiUsers },
  { key: 'stores', label: 'Stores', icon: FiShoppingBag },
  { key: 'categories', label: 'Categories', icon: FiTag },
  { key: 'products', label: 'Products', icon: FiPackage },
  { key: 'vouchers', label: 'Vouchers', icon: FiGift },
  { key: 'invoices', label: 'Invoices', icon: FiFileText },
  { key: 'activityLogs', label: 'Activity Logs', icon: FiActivity },
]

export function dashboardDocumentTitle(feature: DashboardFeatureKey): string {
  return sideBarItems.find((item) => item.key === feature)?.label ?? 'Dashboard'
}
