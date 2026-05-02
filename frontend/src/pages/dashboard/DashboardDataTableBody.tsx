import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type {
  ActivityLogsResponse,
  BasicRow,
  CategoriesResponse,
  CategoryItem,
  DashboardFeatureKey,
  ProductItem,
  ProductsResponse,
  UserItem,
  UsersResponse,
} from './dashboardTypes'

type DashboardDataTableBodyProps = {
  activeFeature: DashboardFeatureKey
  currentItems: number
  isUsersLoading: boolean
  isCategoriesLoading: boolean
  isProductsLoading: boolean
  isActivityLogsLoading: boolean
  isFeatureLoading: boolean
  usersState: UsersResponse
  categoriesState: CategoriesResponse
  productsState: ProductsResponse
  activityLogsState: ActivityLogsResponse
  nonUserItems: BasicRow[]
  isDeleteLoading: boolean
  deletingUserId: string | null
  openEditForm: (user: UserItem) => void
  setConfirmDeleteUser: (user: UserItem | null) => void
  openEditCategoryForm: (category: CategoryItem) => void
  setConfirmDeleteCategory: (category: CategoryItem | null) => void
  isCategoryDeleting: boolean
  deletingCategoryId: string | null
  openEditProductForm: (product: ProductItem) => Promise<void>
  setConfirmDeleteProduct: (product: ProductItem | null) => void
  isProductDeleting: boolean
  deletingProductId: string | null
}

export function DashboardDataTableBody({
  activeFeature,
  currentItems,
  isUsersLoading,
  isCategoriesLoading,
  isProductsLoading,
  isActivityLogsLoading,
  isFeatureLoading,
  usersState,
  categoriesState,
  productsState,
  activityLogsState,
  nonUserItems,
  isDeleteLoading,
  deletingUserId,
  openEditForm,
  setConfirmDeleteUser,
  openEditCategoryForm,
  setConfirmDeleteCategory,
  isCategoryDeleting,
  deletingCategoryId,
  openEditProductForm,
  setConfirmDeleteProduct,
  isProductDeleting,
  deletingProductId,
}: DashboardDataTableBodyProps) {
  return (
    <tbody className="divide-y divide-slate-100 bg-white">
      {(activeFeature === 'users' && isUsersLoading) ||
      (activeFeature === 'categories' && isCategoriesLoading) ||
      (activeFeature === 'products' && isProductsLoading) ||
      (activeFeature === 'activityLogs' && isActivityLogsLoading) ||
      isFeatureLoading ? (
        <tr>
          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
            <div className="inline-flex items-center gap-2">
              <DashboardSpinner />
              {activeFeature === 'users'
                ? 'Loading users...'
                : activeFeature === 'categories'
                  ? 'Loading categories...'
                  : activeFeature === 'products'
                    ? 'Loading products...'
                    : activeFeature === 'activityLogs'
                      ? 'Loading activity logs...'
                      : 'Loading data...'}
            </div>
          </td>
        </tr>
      ) : activeFeature === 'users' ? (
        usersState.items.map((tableUser) => (
          <tr key={tableUser.id} className="align-middle">
            <td className="px-3 py-2.5">
              <p className="font-medium text-slate-800">
                {tableUser.firstName} {tableUser.lastName}
              </p>
            </td>
            <td className="px-3 py-2.5 text-slate-700">{tableUser.email}</td>
            <td className="px-3 py-2.5 text-slate-700">{tableUser.role}</td>
            <td className="px-3 py-2.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  tableUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tableUser.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-3 py-2.5">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(tableUser)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteUser(tableUser)}
                  disabled={isDeleteLoading && deletingUserId === tableUser.id}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))
      ) : activeFeature === 'categories' ? (
        categoriesState.items.map((category) => (
          <tr key={category.id} className="align-middle">
            <td className="px-3 py-2.5">
              <p className="font-medium text-slate-800">{category.name}</p>
            </td>
            <td className="px-3 py-2.5 text-slate-700">{category.slug}</td>
            <td className="px-3 py-2.5 text-slate-700">
              <div className="space-y-1">
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  Level {category.level}
                </span>
                <p className="text-xs text-slate-500">
                  {category.parentName ? `Parent: ${category.parentName}` : 'Root category'}
                </p>
              </div>
            </td>
            <td className="px-3 py-2.5 text-slate-700">{new Date(category.createdAt).toLocaleDateString()}</td>
            <td className="px-3 py-2.5">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditCategoryForm(category)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FiEdit2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCategory(category)}
                  disabled={isCategoryDeleting && deletingCategoryId === category.id}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCategoryDeleting && deletingCategoryId === category.id ? (
                    <DashboardSpinner className="h-3 w-3" />
                  ) : (
                    <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isCategoryDeleting && deletingCategoryId === category.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </td>
          </tr>
        ))
      ) : activeFeature === 'products' ? (
        productsState.items.map((product) => (
          <tr key={product.id} className="align-middle">
            <td className="px-3 py-2.5">
              <p className="font-medium text-slate-800">{product.name}</p>
              <p className="text-xs text-slate-500">SKU: {product.sku}</p>
              <p className="text-xs text-slate-500">A${Number(product.basePrice).toFixed(2)}</p>
            </td>
            <td className="px-3 py-2.5 text-slate-700">{product.categoryName ?? '-'}</td>
            <td className="px-3 py-2.5 text-slate-700">
              <span className="text-xs">
                {product.imageCount} image(s), {product.videoCount} video(s)
              </span>
            </td>
            <td className="px-3 py-2.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  product.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : product.status === 'draft'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {product.status}
              </span>
            </td>
            <td className="px-3 py-2.5">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openEditProductForm(product)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FiEdit2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteProduct(product)}
                  disabled={isProductDeleting && deletingProductId === product.id}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isProductDeleting && deletingProductId === product.id ? (
                    <DashboardSpinner className="h-3 w-3" />
                  ) : (
                    <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isProductDeleting && deletingProductId === product.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </td>
          </tr>
        ))
      ) : activeFeature === 'activityLogs' ? (
        activityLogsState.items.map((log) => (
          <tr key={log.id}>
            <td className="px-3 py-2.5 font-medium text-slate-800">
              {log.firstName} {log.lastName}
            </td>
            <td className="px-3 py-2.5 text-slate-700">{log.email}</td>
            <td className="px-3 py-2.5 text-slate-700">{log.action}</td>
            <td className="px-3 py-2.5 text-slate-700">{new Date(log.createdAt).toLocaleString()}</td>
            <td className="px-3 py-2.5 text-slate-500">-</td>
          </tr>
        ))
      ) : (
        nonUserItems.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2.5 font-medium text-slate-800">{row.primary}</td>
            <td className="px-3 py-2.5 text-slate-700">{row.secondary}</td>
            <td className="px-3 py-2.5 text-slate-700">{row.status}</td>
            <td className="px-3 py-2.5 text-slate-500">-</td>
          </tr>
        ))
      )}

      {!isUsersLoading &&
        !isCategoriesLoading &&
        !isProductsLoading &&
        !isActivityLogsLoading &&
        !isFeatureLoading &&
        currentItems === 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
              No records found.
            </td>
          </tr>
        )}
    </tbody>
  )
}
