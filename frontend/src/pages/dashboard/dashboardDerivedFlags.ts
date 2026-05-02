import type {
  CategoryFormState,
  CategoryItem,
  EditUserFormState,
  ProductDetail,
  ProductFormState,
  UserItem,
} from './dashboardTypes'

export function computeHasEditChanges(editingUser: UserItem | null, editForm: EditUserFormState) {
  if (!editingUser) return false
  return (
    editForm.firstName.trim() !== editingUser.firstName ||
    editForm.lastName.trim() !== editingUser.lastName ||
    editForm.email.trim().toLowerCase() !== editingUser.email.toLowerCase() ||
    editForm.mobile.trim() !== (editingUser.mobile ?? '') ||
    editForm.role !== editingUser.role ||
    editForm.isActive !== editingUser.isActive
  )
}

export function computeHasCategoryChanges(editingCategory: CategoryItem | null, categoryForm: CategoryFormState) {
  if (editingCategory === null) {
    return categoryForm.name.trim().length > 0 && (categoryForm.level === '1' || categoryForm.parentId !== 'none')
  }
  return (
    categoryForm.name.trim() !== editingCategory.name ||
    categoryForm.slug.trim().toLowerCase() !== editingCategory.slug.toLowerCase() ||
    categoryForm.level !== String(editingCategory.level) ||
    (categoryForm.parentId === 'none' ? null : categoryForm.parentId) !== editingCategory.parentId
  )
}

export function computeHasProductChanges(editingProduct: ProductDetail | null, productForm: ProductFormState) {
  if (editingProduct === null) {
    return (
      productForm.sku.trim().length > 0 &&
      productForm.name.trim().length > 0 &&
      productForm.basePrice.trim().length > 0 &&
      productForm.level3Id !== 'none'
    )
  }
  return (
    productForm.sku.trim().toUpperCase() !== editingProduct.sku ||
    productForm.name.trim() !== editingProduct.name ||
    productForm.description.trim() !== (editingProduct.description ?? '') ||
    Number(productForm.basePrice || 0) !== Number(editingProduct.basePrice) ||
    productForm.status !== editingProduct.status ||
    productForm.level3Id !== (editingProduct.categoryId ?? 'none') ||
    productForm.imageS3Keys.filter((item) => item.trim().length > 0).join('|') !== editingProduct.imageS3Keys.join('|') ||
    productForm.videoUrls.filter((item) => item.trim().length > 0).join('|') !== editingProduct.videoUrls.join('|')
  )
}
