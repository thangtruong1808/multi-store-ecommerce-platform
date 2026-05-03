import type { Dispatch, SetStateAction } from 'react'

import { DashboardDataTableBody } from './DashboardDataTableBody'
import { DashboardDataTableFooter } from './DashboardDataTableFooter'
import { DashboardDataTableHead } from './DashboardDataTableHead'
import { DashboardDataTableTopBar } from './DashboardDataTableTopBar'
import type {
  ActivityLogsResponse,
  BasicRow,
  CategoriesResponse,
  CategoryItem,
  DashboardFeatureKey,
  ProductItem,
  ProductsResponse,
  StoreItem,
  StoresResponse,
  UserItem,
  UsersResponse,
} from './dashboardTypes'

type DashboardDataTableProps = {
  activeFeature: DashboardFeatureKey
  pageSize: number
  setPageSize: Dispatch<SetStateAction<number>>
  page: number
  setPage: Dispatch<SetStateAction<number>>
  currentItems: number
  totalItems: number
  totalPages: number
  isUsersLoading: boolean
  isStoresLoading: boolean
  isCategoriesLoading: boolean
  isProductsLoading: boolean
  isActivityLogsLoading: boolean
  isFeatureLoading: boolean
  usersState: UsersResponse
  storesState: StoresResponse
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
  openEditStoreForm: (store: StoreItem) => void
  setConfirmDeleteStore: (store: StoreItem | null) => void
  isStoreDeleting: boolean
  deletingStoreId: string | null
  canMutateStores: boolean
}

export function DashboardDataTable({
  activeFeature,
  pageSize,
  setPageSize,
  page,
  setPage,
  currentItems,
  totalItems,
  totalPages,
  isUsersLoading,
  isStoresLoading,
  isCategoriesLoading,
  isProductsLoading,
  isActivityLogsLoading,
  isFeatureLoading,
  usersState,
  storesState,
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
  openEditStoreForm,
  setConfirmDeleteStore,
  isStoreDeleting,
  deletingStoreId,
  canMutateStores,
}: DashboardDataTableProps) {
  const safePage = Math.min(page, totalPages)

  return (
    <>
      <DashboardDataTableTopBar
        currentItems={currentItems}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <DashboardDataTableHead activeFeature={activeFeature} />
          <DashboardDataTableBody
            activeFeature={activeFeature}
            currentItems={currentItems}
            isUsersLoading={isUsersLoading}
            isStoresLoading={isStoresLoading}
            isCategoriesLoading={isCategoriesLoading}
            isProductsLoading={isProductsLoading}
            isActivityLogsLoading={isActivityLogsLoading}
            isFeatureLoading={isFeatureLoading}
            usersState={usersState}
            storesState={storesState}
            categoriesState={categoriesState}
            productsState={productsState}
            activityLogsState={activityLogsState}
            nonUserItems={nonUserItems}
            isDeleteLoading={isDeleteLoading}
            deletingUserId={deletingUserId}
            openEditForm={openEditForm}
            setConfirmDeleteUser={setConfirmDeleteUser}
            openEditCategoryForm={openEditCategoryForm}
            setConfirmDeleteCategory={setConfirmDeleteCategory}
            isCategoryDeleting={isCategoryDeleting}
            deletingCategoryId={deletingCategoryId}
            openEditProductForm={openEditProductForm}
            setConfirmDeleteProduct={setConfirmDeleteProduct}
            isProductDeleting={isProductDeleting}
            deletingProductId={deletingProductId}
            openEditStoreForm={openEditStoreForm}
            setConfirmDeleteStore={setConfirmDeleteStore}
            isStoreDeleting={isStoreDeleting}
            deletingStoreId={deletingStoreId}
            canMutateStores={canMutateStores}
          />
        </table>
      </div>

      <DashboardDataTableFooter page={page} setPage={setPage} totalPages={totalPages} safePage={safePage} />
    </>
  )
}
