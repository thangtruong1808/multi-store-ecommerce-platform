import { describe, expect, it } from 'vitest'

import type { ProductFormState } from '../../src/pages/dashboard/dashboardTypes'
import {
  countValidationIssues,
  validateProductFormFields,
} from '../../src/pages/dashboard/products/productFormValidation'

function validForm(overrides: Partial<ProductFormState> = {}): ProductFormState {
  return {
    sku: 'ACME-01',
    name: 'Test product',
    description: '',
    basePrice: '19.99',
    status: 'active',
    isClearance: false,
    isRefurbished: false,
    level1Id: 'l1',
    level2Id: 'l2',
    level3Id: 'l3',
    imageS3Keys: [''],
    videoUrls: [''],
    storeIds: ['store-1'],
    storeQuantities: { 'store-1': '10' },
    ...overrides,
  }
}

describe('Products / productFormValidation', () => {
  it('returns no errors for a valid form', () => {
    const errors = validateProductFormFields(validForm())
    expect(errors).toEqual({})
    expect(countValidationIssues(errors)).toBe(0)
  })

  it('requires SKU with at least 2 characters', () => {
    const errors = validateProductFormFields(validForm({ sku: 'A' }))
    expect(errors.sku).toContain('at least 2')
  })

  it('requires level 3 category', () => {
    const errors = validateProductFormFields(validForm({ level3Id: 'none' }))
    expect(errors.category).toBeTruthy()
  })

  it('rejects invalid video URLs', () => {
    const errors = validateProductFormFields(validForm({ videoUrls: ['not-a-url'] }))
    expect(errors['video-0']).toContain('https')
  })

  it('rejects non-numeric store stock', () => {
    const errors = validateProductFormFields(
      validForm({ storeQuantities: { 'store-1': '12.5' } }),
    )
    expect(errors.storeStock).toContain('whole numbers')
  })
})
