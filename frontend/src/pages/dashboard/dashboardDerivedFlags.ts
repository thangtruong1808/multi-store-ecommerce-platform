import type {
  CategoryFormState,
  CategoryItem,
  EditUserFormState,
  ProductDetail,
  ProductFormState,
  StoreFormState,
  StoreItem,
  UserItem,
} from './dashboardTypes'

function sortedIdList(ids: string[]) {
  return [...ids].sort().join(',')
}

export function computeHasEditChanges(
  editingUser: UserItem | null,
  editForm: EditUserFormState,
  initialManagedStoreIds: string[] | null,
) {
  if (!editingUser) return false
  const storesChanged =
    initialManagedStoreIds !== null && sortedIdList(editForm.managedStoreIds) !== sortedIdList(initialManagedStoreIds)
  return (
    editForm.firstName.trim() !== editingUser.firstName ||
    editForm.lastName.trim() !== editingUser.lastName ||
    editForm.email.trim().toLowerCase() !== editingUser.email.toLowerCase() ||
    editForm.mobile.trim() !== (editingUser.mobile ?? '') ||
    editForm.role !== editingUser.role ||
    editForm.isActive !== editingUser.isActive ||
    storesChanged
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

function sortedIds(ids: string[]) {
  return [...ids].sort().join(',')
}

function normalizedStockSignature(productForm: ProductFormState): string {
  return [...productForm.storeIds]
    .sort()
    .map((id) => `${id}:${parseInt(productForm.storeQuantities[id] ?? '0', 10) || 0}`)
    .join('|')
}

function baselineStockSignature(editingProduct: ProductDetail): string {
  const ids = editingProduct.storeIds ?? []
  const stock = editingProduct.storeStock ?? []
  return [...ids]
    .sort()
    .map((id) => {
      const q = stock.find((s) => s.storeId === id)?.quantity ?? 0
      return `${id}:${q}`
    })
    .join('|')
}

export function computeHasProductChanges(editingProduct: ProductDetail | null, productForm: ProductFormState) {
  if (editingProduct === null) {
    return (
      productForm.sku.trim().length > 0 &&
      productForm.name.trim().length > 0 &&
      productForm.basePrice.trim().length > 0 &&
      productForm.level3Id !== 'none' &&
      productForm.storeIds.length > 0
    )
  }
  const prevStores = sortedIds(editingProduct.storeIds ?? [])
  const nextStores = sortedIds(productForm.storeIds)
  return (
    productForm.sku.trim().toUpperCase() !== editingProduct.sku ||
    productForm.name.trim() !== editingProduct.name ||
    productForm.description.trim() !== (editingProduct.description ?? '') ||
    Number(productForm.basePrice || 0) !== Number(editingProduct.basePrice) ||
    productForm.status !== editingProduct.status ||
    productForm.isClearance !== Boolean(editingProduct.isClearance) ||
    productForm.isRefurbished !== Boolean(editingProduct.isRefurbished) ||
    productForm.level3Id !== (editingProduct.categoryId ?? 'none') ||
    productForm.imageS3Keys.filter((item) => item.trim().length > 0).join('|') !== editingProduct.imageS3Keys.join('|') ||
    productForm.videoUrls.filter((item) => item.trim().length > 0).join('|') !== editingProduct.videoUrls.join('|') ||
    prevStores !== nextStores ||
    normalizedStockSignature(productForm) !== baselineStockSignature(editingProduct)
  )
}

export function computeHasStoreChanges(editingStore: StoreItem | null, storeForm: StoreFormState) {
  if (editingStore === null) {
    return storeForm.name.trim().length >= 2
  }
  return (
    storeForm.name.trim() !== editingStore.name ||
    storeForm.slug.trim().toLowerCase() !== editingStore.slug.toLowerCase() ||
    (storeForm.email.trim() || '') !== (editingStore.email ?? '') ||
    (storeForm.phone.trim() || '') !== (editingStore.phone ?? '') ||
    storeForm.defaultCurrencyCode.trim() !== editingStore.defaultCurrencyCode ||
    storeForm.timezone.trim() !== editingStore.timezone ||
    storeForm.isActive !== editingStore.isActive
  )
}
