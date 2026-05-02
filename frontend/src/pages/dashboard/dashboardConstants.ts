import {
  FiGrid,
  FiLayers,
  FiList,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiUsers,
} from 'react-icons/fi'

import type { BasicRow, DashboardFeatureKey, SidebarItem } from './dashboardTypes'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export const sideBarItems: SidebarItem[] = [
  { key: 'users', label: 'Users', icon: FiUsers },
  { key: 'stores', label: 'Stores', icon: FiGrid },
  { key: 'categories', label: 'Categories', icon: FiList },
  { key: 'products', label: 'Products', icon: FiPackage },
  { key: 'vouchers', label: 'Vouchers', icon: FiLayers },
  { key: 'invoices', label: 'Invoices', icon: FiSettings },
  { key: 'activityLogs', label: 'Activity Logs', icon: FiRefreshCw },
]

export const mockData: Record<
  Exclude<DashboardFeatureKey, 'users' | 'categories' | 'products' | 'activityLogs'>,
  BasicRow[]
> = {
  stores: [
    { id: '1', primary: 'Sydney Flagship', secondary: 'AU-SYD', status: 'Active' },
    { id: '2', primary: 'Melbourne Central', secondary: 'AU-MEL', status: 'Active' },
    { id: '3', primary: 'Brisbane Online Hub', secondary: 'AU-BNE', status: 'Draft' },
  ],
  vouchers: [
    { id: '1', primary: 'WELCOME10', secondary: '10% Off', status: 'Active' },
    { id: '2', primary: 'FREESHIP', secondary: 'Free Delivery', status: 'Active' },
  ],
  invoices: [
    { id: '1', primary: 'INV-1001', secondary: 'A$1,250.00', status: 'Paid' },
    { id: '2', primary: 'INV-1002', secondary: 'A$430.50', status: 'Pending' },
    { id: '3', primary: 'INV-1003', secondary: 'A$92.00', status: 'Overdue' },
  ],
}
