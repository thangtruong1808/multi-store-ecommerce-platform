import type { Dispatch, SetStateAction } from 'react'

import { DashboardProductDeleteModal } from './DashboardProductDeleteModal'
import { DashboardProductFormModal } from './DashboardProductFormModal'
import type {
  CategoryParentOption,
  ManagedStoreOption,
  ProductDetail,
  ProductFormState,
  ProductItem,
} from './dashboardTypes'

type DashboardProductModalsProps = {
  isProductFormOpen: boolean
  closeProductForm: () => void
  editingProduct: ProductDetail | null
  productForm: ProductFormState
  setProductForm: Dispatch<SetStateAction<ProductFormState>>
  level1Options: CategoryParentOption[]
  level2Options: CategoryParentOption[]
  level3Options: CategoryParentOption[]
  isProductCategoriesLoading: boolean
  handleProductImageChange: (index: number, value: string) => void
  handleProductVideoChange: (index: number, value: string) => void
  hasProductChanges: boolean
  isProductSaving: boolean
  onSaveProduct: () => void
  confirmDeleteProduct: ProductItem | null
  setConfirmDeleteProduct: (product: ProductItem | null) => void
  isProductDeleting: boolean
  onDeleteProduct: (product: ProductItem) => void
  managedStores: ManagedStoreOption[]
  isManagedStoresLoading: boolean
  isAdminUser: boolean
  toggleProductStoreId: (storeId: string) => void
  onSelectAllStores: () => void
  onStoreQuantityChange: (storeId: string, value: string) => void
}

export function DashboardProductModals({
  isProductFormOpen,
  closeProductForm,
  editingProduct,
  productForm,
  setProductForm,
  level1Options,
  level2Options,
  level3Options,
  isProductCategoriesLoading,
  handleProductImageChange,
  handleProductVideoChange,
  hasProductChanges,
  isProductSaving,
  onSaveProduct,
  confirmDeleteProduct,
  setConfirmDeleteProduct,
  isProductDeleting,
  onDeleteProduct,
  managedStores,
  isManagedStoresLoading,
  isAdminUser,
  toggleProductStoreId,
  onSelectAllStores,
  onStoreQuantityChange,
}: DashboardProductModalsProps) {
  return (
    <>
      {isProductFormOpen && (
        <DashboardProductFormModal
          closeProductForm={closeProductForm}
          editingProduct={editingProduct}
          productForm={productForm}
          setProductForm={setProductForm}
          level1Options={level1Options}
          level2Options={level2Options}
          level3Options={level3Options}
          isProductCategoriesLoading={isProductCategoriesLoading}
          handleProductImageChange={handleProductImageChange}
          handleProductVideoChange={handleProductVideoChange}
          hasProductChanges={hasProductChanges}
          isProductSaving={isProductSaving}
          onSaveProduct={onSaveProduct}
          managedStores={managedStores}
          isManagedStoresLoading={isManagedStoresLoading}
          isAdminUser={isAdminUser}
          toggleProductStoreId={toggleProductStoreId}
          onSelectAllStores={onSelectAllStores}
          onStoreQuantityChange={onStoreQuantityChange}
        />
      )}

      {confirmDeleteProduct && (
        <DashboardProductDeleteModal
          confirmDeleteProduct={confirmDeleteProduct}
          setConfirmDeleteProduct={setConfirmDeleteProduct}
          isProductDeleting={isProductDeleting}
          onDeleteProduct={onDeleteProduct}
        />
      )}
    </>
  )
}
