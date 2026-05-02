import type { ComponentType } from 'react'

export type DashboardFeatureKey =
  | 'users'
  | 'stores'
  | 'categories'
  | 'products'
  | 'vouchers'
  | 'invoices'
  | 'activityLogs'

export type SidebarItem = {
  key: DashboardFeatureKey
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

export type UserItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  mobile?: string | null
  role: 'admin' | 'store_manager' | 'staff' | 'customer'
  isActive: boolean
  createdAt: string
}

export type UsersResponse = {
  items: UserItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type ActivityLogItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  action: string
  createdAt: string
}

export type ActivityLogsResponse = {
  items: ActivityLogItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type CategoryItem = {
  id: string
  parentId: string | null
  parentName: string | null
  name: string
  slug: string
  level: 1 | 2 | 3
  createdAt: string
}

export type CategoriesResponse = {
  items: CategoryItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type CategoryParentOption = {
  id: string
  parentId?: string | null
  name: string
  slug: string
  level: 1 | 2 | 3
}

export type ProductItem = {
  id: string
  sku: string
  name: string
  description?: string | null
  basePrice: number
  status: 'active' | 'inactive' | 'draft'
  categoryId: string | null
  categoryName: string | null
  imageCount: number
  videoCount: number
  createdAt: string
  updatedAt: string
}

export type ProductDetail = ProductItem & {
  imageS3Keys: string[]
  videoUrls: string[]
}

export type ProductsResponse = {
  items: ProductItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type ProductFormState = {
  sku: string
  name: string
  description: string
  basePrice: string
  status: 'active' | 'inactive' | 'draft'
  level1Id: 'none' | string
  level2Id: 'none' | string
  level3Id: 'none' | string
  imageS3Keys: string[]
  videoUrls: string[]
}

export type BasicRow = {
  id: string
  primary: string
  secondary: string
  status: string
}

export type EditUserFormState = {
  firstName: string
  lastName: string
  email: string
  mobile: string
  role: UserItem['role']
  isActive: boolean
}

export type CategoryFormState = {
  name: string
  slug: string
  level: '1' | '2' | '3'
  parentId: 'none' | string
}
