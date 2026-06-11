import { describe, expect, it } from 'vitest'

import {
  displayableProductImageKeys,
  isLegacySeedPlaceholderKey,
  isUploadedProductMediaKey,
  normalizeProductImageKeysForForm,
  persistableProductImageKeys,
} from '../../src/utils/productMediaKeys'

describe('Products / productMediaKeys', () => {
  const stagingKey =
    'products/staging/11111111-1111-1111-1111-111111111111/a1b2c3d4e5f6478990a1b2c3d4e5f678.webp'
  const productKey = 'products/22222222-2222-2222-2222-222222222222/a1b2c3d4e5f6478990a1b2c3d4e5f678.webp'

  it('isUploadedProductMediaKey accepts staging and product webp keys', () => {
    expect(isUploadedProductMediaKey(stagingKey)).toBe(true)
    expect(isUploadedProductMediaKey(productKey)).toBe(true)
    expect(isUploadedProductMediaKey('products/my-sku/01.jpg')).toBe(false)
  })

  it('isLegacySeedPlaceholderKey matches seed jpg placeholders', () => {
    expect(isLegacySeedPlaceholderKey('products/my-sku-01/01.jpg')).toBe(true)
    expect(isLegacySeedPlaceholderKey('products/my-sku-01/04.jpg')).toBe(true)
    expect(isLegacySeedPlaceholderKey(stagingKey)).toBe(false)
  })

  it('normalizeProductImageKeysForForm keeps uploads or one empty slot', () => {
    expect(normalizeProductImageKeysForForm([stagingKey])).toEqual([stagingKey])
    expect(normalizeProductImageKeysForForm(['products/sku/01.jpg', 'products/sku/02.jpg'])).toEqual([''])
    expect(normalizeProductImageKeysForForm([stagingKey, 'products/sku/02.jpg'])).toEqual([stagingKey])
  })

  it('persistableProductImageKeys and displayableProductImageKeys filter legacy keys', () => {
    const mixed = [stagingKey, 'products/sku/01.jpg', productKey]
    expect(persistableProductImageKeys(mixed)).toEqual([stagingKey, productKey])
    expect(displayableProductImageKeys(mixed)).toEqual([stagingKey, productKey])
  })
})
