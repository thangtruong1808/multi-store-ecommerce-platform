/** Department hub: all subcategories under a level-1 department (e.g. `/laptop/browse`). */
export function departmentBrowsePath(level1Slug: string) {
  return `/${encodeURIComponent(level1Slug.trim())}/browse`
}

/** Tiered URL: `/{level1Slug}/{categorySlug}/products` (e.g. `/desktop/lenovo/products`). */
export function categoryProductsPath(level1Slug: string, categorySlug: string) {
  return `/${encodeURIComponent(level1Slug.trim())}/${encodeURIComponent(categorySlug.trim())}/products`
}

/** Tiered product detail: `/{level1Slug}/{categorySlug}/products/{sku}` — SKU segment is lowercased in the path for stable, readable URLs. */
export function publicProductDetailPath(level1Slug: string, categorySlug: string, productSku: string) {
  const base = categoryProductsPath(level1Slug, categorySlug)
  const skuSegment = productSku.trim().toLowerCase()
  return `${base}/${encodeURIComponent(skuSegment)}`
}

/** Matches paths like `/desktop/lenovo/products` (not `/shop/...`). */
export function isTieredCategoryProductsPath(pathname: string): boolean {
  return /^\/[^/]+\/[^/]+\/products\/?$/.test(pathname)
}

/** Matches department hub URLs like `/laptop/browse`. */
export function isDepartmentBrowsePath(pathname: string): boolean {
  return /^\/[^/]+\/browse\/?$/.test(pathname)
}
