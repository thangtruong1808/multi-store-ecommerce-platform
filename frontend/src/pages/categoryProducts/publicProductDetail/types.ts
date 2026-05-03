export type PublicProductDetail = {
  id: string
  sku: string
  name: string
  description: string | null
  basePrice: number
  categoryId?: string | null
  categoryName?: string | null
  imageS3Keys: string[]
  videoUrls: string[]
  /** Aggregated sellable units across visible, active stores */
  availableQuantity?: number
}

export type RelatedProductItem = {
  id: string
  sku: string
  name: string
  basePrice: number
  categoryName?: string | null
}
