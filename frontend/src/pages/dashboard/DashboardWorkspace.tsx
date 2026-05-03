import { DashboardCategoryFilters } from './DashboardCategoryFilters'
import { DashboardCategoryModals } from './DashboardCategoryModals'
import { DashboardDataTable } from './DashboardDataTable'
import { DashboardMessages } from './DashboardMessages'
import { DashboardProductFilters } from './DashboardProductFilters'
import { DashboardProductModals } from './DashboardProductModals'
import { DashboardStoreFilters } from './DashboardStoreFilters'
import { DashboardStoreModals } from './DashboardStoreModals'
import { DashboardToolbar } from './DashboardToolbar'
import { DashboardUserModals } from './DashboardUserModals'
import type { DashboardModel } from './hooks/useDashboardModel'

type DashboardWorkspaceProps = {
  model: DashboardModel
}

export function DashboardWorkspace({ model }: DashboardWorkspaceProps) {
  const { activeFeature } = model
  const u = model.users
  const c = model.categories
  const p = model.products
  const s = model.stores

  return (
    <section className="min-w-0 p-3 sm:p-4 lg:p-6">
      <DashboardToolbar
        activeFeature={activeFeature}
        isSidebarOpen={model.isSidebarOpen}
        setIsSidebarOpen={model.setIsSidebarOpen}
        isFeatureLoading={model.isFeatureLoading}
      />

      <DashboardMessages
        aggregateError={model.aggregateError}
        inlineStatusMessage={model.inlineStatusMessage}
        inlineStatusType={model.inlineStatusType}
      />

      {activeFeature === 'users' && (
        <DashboardUserModals
          editingUser={u.editingUser}
          onCloseEdit={() => u.setEditingUser(null)}
          editForm={u.editForm}
          setEditForm={u.setEditForm}
          hasEditChanges={model.hasEditChanges}
          isEditSaving={u.isEditSaving}
          onSaveUser={() => void u.handleSaveUser()}
          isAdminSession={u.isAdminSession}
          adminStoreOptions={u.adminStoreOptions}
          isUserStoreDataLoading={u.isUserStoreDataLoading}
          toggleUserManagedStore={u.toggleUserManagedStore}
          confirmDeleteUser={u.confirmDeleteUser}
          setConfirmDeleteUser={u.setConfirmDeleteUser}
          isDeleteLoading={u.isDeleteLoading}
          onSoftDeleteUser={(user) => void u.handleSoftDeleteUser(user)}
        />
      )}

      {activeFeature === 'categories' && (
        <DashboardCategoryModals
          isCategoryFormOpen={c.isCategoryFormOpen}
          closeCategoryForm={c.closeCategoryForm}
          editingCategory={c.editingCategory}
          categoryForm={c.categoryForm}
          setCategoryForm={c.setCategoryForm}
          categoryFormParentOptions={c.categoryFormParentOptions}
          isCategoryFormParentsLoading={c.isCategoryFormParentsLoading}
          hasCategoryChanges={model.hasCategoryChanges}
          isCategorySaving={c.isCategorySaving}
          onSaveCategory={() => void c.handleSaveCategory()}
          confirmDeleteCategory={c.confirmDeleteCategory}
          setConfirmDeleteCategory={c.setConfirmDeleteCategory}
          isCategoryDeleting={c.isCategoryDeleting}
          onDeleteCategory={(category) => void c.handleDeleteCategory(category)}
        />
      )}

      {activeFeature === 'stores' && (
        <DashboardStoreModals
          isStoreFormOpen={s.isStoreFormOpen}
          closeStoreForm={s.closeStoreForm}
          editingStore={s.editingStore}
          storeForm={s.storeForm}
          setStoreForm={s.setStoreForm}
          hasStoreChanges={model.hasStoreChanges}
          isStoreSaving={s.isStoreSaving}
          onSaveStore={() => void s.handleSaveStore()}
          confirmDeleteStore={s.confirmDeleteStore}
          setConfirmDeleteStore={s.setConfirmDeleteStore}
          isStoreDeleting={s.isStoreDeleting}
          onDeleteStore={(store) => void s.handleDeleteStore(store)}
        />
      )}

      {activeFeature === 'products' && (
        <DashboardProductModals
          isProductFormOpen={p.isProductFormOpen}
          closeProductForm={p.closeProductForm}
          editingProduct={p.editingProduct}
          productForm={p.productForm}
          setProductForm={p.setProductForm}
          level1Options={p.level1Options}
          level2Options={p.level2Options}
          level3Options={p.level3Options}
          isProductCategoriesLoading={p.isProductCategoriesLoading}
          handleProductImageChange={p.handleProductImageChange}
          handleProductVideoChange={p.handleProductVideoChange}
          hasProductChanges={model.hasProductChanges}
          isProductSaving={p.isProductSaving}
          onSaveProduct={() => void p.handleSaveProduct()}
          confirmDeleteProduct={p.confirmDeleteProduct}
          setConfirmDeleteProduct={p.setConfirmDeleteProduct}
          isProductDeleting={p.isProductDeleting}
          onDeleteProduct={(product) => void p.handleDeleteProduct(product)}
          managedStores={p.managedStores}
          isManagedStoresLoading={p.isManagedStoresLoading}
          isAdminUser={p.isAdminUser}
          toggleProductStoreId={p.toggleProductStoreId}
          onSelectAllStores={p.selectAllManagedStores}
          onStoreQuantityChange={p.setProductStoreQuantity}
        />
      )}

      {activeFeature === 'categories' && (
        <DashboardCategoryFilters
          categoryFilterLevel={c.categoryFilterLevel}
          setCategoryFilterLevel={c.setCategoryFilterLevel}
          setCategoryFilterParentId={c.setCategoryFilterParentId}
          categoryFilterParentId={c.categoryFilterParentId}
          isCategoryParentsLoading={c.isCategoryParentsLoading}
          categoryParentOptions={c.categoryParentOptions}
          categorySearchInput={c.categorySearchInput}
          setCategorySearchInput={c.setCategorySearchInput}
          onApplyCategorySearch={() => c.setCategorySearchText(c.categorySearchInput)}
          onOpenCreateCategory={c.openCreateCategoryForm}
        />
      )}

      {activeFeature === 'stores' && (
        <DashboardStoreFilters
          storeSearchInput={s.storeSearchInput}
          setStoreSearchInput={s.setStoreSearchInput}
          onApplyStoreSearch={() => s.setStoreSearchText(s.storeSearchInput)}
          onOpenCreateStore={s.openCreateStoreForm}
          canMutateStores={s.isAdmin}
        />
      )}

      {activeFeature === 'products' && (
        <DashboardProductFilters
          productFilterStatus={p.productFilterStatus}
          setProductFilterStatus={p.setProductFilterStatus}
          productFilterCategoryId={p.productFilterCategoryId}
          setProductFilterCategoryId={p.setProductFilterCategoryId}
          productCategoriesTree={p.productCategoriesTree}
          productSearchInput={p.productSearchInput}
          setProductSearchInput={p.setProductSearchInput}
          onApplyProductSearch={() => p.setProductSearchText(p.productSearchInput)}
          onOpenCreateProduct={p.openCreateProductForm}
        />
      )}

      <DashboardDataTable
        activeFeature={activeFeature}
        pageSize={model.pageSize}
        setPageSize={model.setPageSize}
        page={model.page}
        setPage={model.setPage}
        currentItems={model.currentItems}
        totalItems={model.totalItems}
        totalPages={model.totalPages}
        isUsersLoading={u.isUsersLoading}
        isStoresLoading={s.isStoresLoading}
        isCategoriesLoading={c.isCategoriesLoading}
        isProductsLoading={p.isProductsLoading}
        isActivityLogsLoading={u.isActivityLogsLoading}
        isFeatureLoading={model.isFeatureLoading}
        usersState={u.usersState}
        storesState={s.storesState}
        categoriesState={c.categoriesState}
        productsState={p.productsState}
        activityLogsState={u.activityLogsState}
        nonUserItems={model.nonUserItems}
        isDeleteLoading={u.isDeleteLoading}
        deletingUserId={u.deletingUserId}
        openEditForm={u.openEditForm}
        setConfirmDeleteUser={u.setConfirmDeleteUser}
        openEditCategoryForm={c.openEditCategoryForm}
        setConfirmDeleteCategory={c.setConfirmDeleteCategory}
        isCategoryDeleting={c.isCategoryDeleting}
        deletingCategoryId={c.deletingCategoryId}
        openEditProductForm={p.openEditProductForm}
        setConfirmDeleteProduct={p.setConfirmDeleteProduct}
        isProductDeleting={p.isProductDeleting}
        deletingProductId={p.deletingProductId}
        openEditStoreForm={s.openEditStoreForm}
        setConfirmDeleteStore={s.setConfirmDeleteStore}
        isStoreDeleting={s.isStoreDeleting}
        deletingStoreId={s.deletingStoreId}
        canMutateStores={s.isAdmin}
      />
    </section>
  )
}
