import type {
  ActivityLogsResponse,
  CategoriesResponse,
  DashboardFeatureKey,
  InvoicesResponse,
  ProductsResponse,
  StoresResponse,
  UsersResponse,
  VouchersResponse,
} from './dashboardTypes'

export function getNonUserRows(_activeFeature: DashboardFeatureKey) {
  return []
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
  invoicesState: InvoicesResponse
  vouchersState: VouchersResponse
}) {
  const {
    activeFeature,
    page,
    pageSize,
    usersState,
    storesState,
    categoriesState,
    productsState,
    activityLogsState,
    invoicesState,
    vouchersState,
  } = args

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
              : activeFeature === 'invoices'
                ? invoicesState.totalItems
                : activeFeature === 'vouchers'
                  ? vouchersState.totalItems
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
              : activeFeature === 'invoices'
                ? invoicesState.totalPages
                : activeFeature === 'vouchers'
                  ? vouchersState.totalPages
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
              : activeFeature === 'invoices'
                ? invoicesState.items.length
                : activeFeature === 'vouchers'
                  ? vouchersState.items.length
                  : nonUserItems.length

  return { nonUserItems, totalItems, totalPages, currentItems }
}
