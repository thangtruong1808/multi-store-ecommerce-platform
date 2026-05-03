import { mockData } from './dashboardConstants'
import type {
  ActivityLogsResponse,
  CategoriesResponse,
  DashboardFeatureKey,
  ProductsResponse,
  StoresResponse,
  UsersResponse,
} from './dashboardTypes'

/** Mock / static feature rows shown for vouchers, invoices. */
export function getNonUserRows(activeFeature: DashboardFeatureKey) {
  if (
    activeFeature === 'users' ||
    activeFeature === 'stores' ||
    activeFeature === 'categories' ||
    activeFeature === 'products' ||
    activeFeature === 'activityLogs'
  ) {
    return []
  }
  return mockData[activeFeature]
}

export function deriveDashboardPagination(args: {
  activeFeature: DashboardFeatureKey
  page: number
  pageSize: number
  usersState: UsersResponse
  storesState: StoresResponse
  categoriesState: CategoriesResponse
  productsState: ProductsResponse
  activityLogsState: ActivityLogsResponse
}) {
  const { activeFeature, page, pageSize, usersState, storesState, categoriesState, productsState, activityLogsState } =
    args

  const nonUserRows = getNonUserRows(activeFeature)
  const nonUserTotal = nonUserRows.length
  const nonUserTotalPages = Math.max(1, Math.ceil(nonUserTotal / pageSize))
  const nonUserStart = (page - 1) * pageSize
  const nonUserItems = nonUserRows.slice(nonUserStart, nonUserStart + pageSize)

  const totalItems =
    activeFeature === 'users'
      ? usersState.totalItems
      : activeFeature === 'stores'
        ? storesState.totalItems
        : activeFeature === 'categories'
          ? categoriesState.totalItems
          : activeFeature === 'products'
            ? productsState.totalItems
            : activeFeature === 'activityLogs'
              ? activityLogsState.totalItems
              : nonUserTotal

  const totalPages =
    activeFeature === 'users'
      ? usersState.totalPages
      : activeFeature === 'stores'
        ? storesState.totalPages
        : activeFeature === 'categories'
          ? categoriesState.totalPages
          : activeFeature === 'products'
            ? productsState.totalPages
            : activeFeature === 'activityLogs'
              ? activityLogsState.totalPages
              : nonUserTotalPages

  const currentItems =
    activeFeature === 'users'
      ? usersState.items.length
      : activeFeature === 'stores'
        ? storesState.items.length
        : activeFeature === 'categories'
          ? categoriesState.items.length
          : activeFeature === 'products'
            ? productsState.items.length
            : activeFeature === 'activityLogs'
              ? activityLogsState.items.length
              : nonUserItems.length

  return { nonUserItems, totalItems, totalPages, currentItems }
}
