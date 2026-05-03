import type { ProductFormState } from '../dashboardTypes'

/** Short guidance shown under each field (matches server rules where applicable). */
export const PRODUCT_FIELD_HINTS = {
  sku: 'Minimum 2 characters. Use letters, numbers, and hyphens (e.g. ACME-WIDGET-01). Saved in uppercase.',
  name: 'Minimum 2 characters. Clear product title customers will recognize.',
  description:
    'Optional. Use one line per detail—features, materials, dimensions, warranty—each line can be shown as its own bullet on the storefront.',
  basePrice: 'Use dot as decimal separator (e.g. 19.99). Must be zero or greater.',
  status: 'active = visible to shoppers when catalog rules allow; inactive/draft for hiding or work-in-progress.',
  clearance: 'When checked, this product can appear in clearance storefront sections.',
  refurbished: 'When checked, this product can appear in refurbished storefront sections.',
  category: 'Choose Level 1, then Level 2, then Level 3. Products must sit under a Level 3 category.',
  stores: 'Pick which stores sell this product. Store managers only see stores they are assigned to.',
  storeStock: 'Use whole numbers from 0 up to 999,999 per store.',
  images: 'Up to 4 optional image keys (storage paths after upload). Leave blank rows out or remove them.',
  videos: 'Optional. Each line must be a full URL starting with https:// or http://',
} as const

export type ProductFormErrors = Record<string, string>

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Returns empty object when the form is valid for submission. */
export function validateProductFormFields(form: ProductFormState): ProductFormErrors {
  const errors: ProductFormErrors = {}

  const sku = form.sku.trim()
  if (sku.length < 2) {
    errors.sku = 'SKU must be at least 2 characters.'
  }

  const name = form.name.trim()
  if (name.length < 2) {
    errors.name = 'Product name must be at least 2 characters.'
  }

  const description = form.description.trim()
  if (description.length > 8000) {
    errors.description = 'Description is too long (max 8000 characters). Shorten or split across lines.'
  }

  const priceRaw = form.basePrice.trim()
  if (priceRaw.length === 0) {
    errors.basePrice = 'Enter a base price.'
  } else {
    const normalized = priceRaw.replace(/,/g, '')
    if (!/^\d+(\.\d{1,4})?$/.test(normalized)) {
      errors.basePrice = 'Use a valid number (e.g. 12 or 12.99). Only digits and one decimal part.'
    } else {
      const n = Number(normalized)
      if (Number.isNaN(n) || n < 0) {
        errors.basePrice = 'Base price must be zero or greater.'
      }
    }
  }

  if (form.level3Id === 'none') {
    errors.category = 'Select Level 1, Level 2, and a Level 3 category.'
  }

  if (form.storeIds.length === 0) {
    errors.stores = 'Select at least one store.'
  }

  const maxQty = 999_999
  for (const storeId of form.storeIds) {
    const raw = (form.storeQuantities[storeId] ?? '').trim()
    if (raw.length === 0) {
      errors.storeStock = 'Enter a quantity for each selected store (0 or more).'
      break
    }
    if (!/^\d+$/.test(raw)) {
      errors.storeStock = 'Stock quantities must be whole numbers (no decimals).'
      break
    }
    const n = parseInt(raw, 10)
    if (n > maxQty) {
      errors.storeStock = `Quantity cannot exceed ${maxQty.toLocaleString('en-AU')}.`
      break
    }
  }

  const filledImages = form.imageS3Keys.map((s) => s.trim()).filter((s) => s.length > 0)
  if (filledImages.length > 4) {
    errors.images = 'At most 4 image keys are allowed. Remove or clear extra rows.'
  }

  form.videoUrls.forEach((raw, index) => {
    const v = raw.trim()
    if (v.length === 0) return
    if (!isValidHttpUrl(v)) {
      errors[`video-${index}`] = 'Use a full URL starting with https:// or http:// (e.g. https://example.com/video.mp4).'
    }
  })

  return errors
}

export function countValidationIssues(errors: ProductFormErrors): number {
  return Object.keys(errors).length
}
