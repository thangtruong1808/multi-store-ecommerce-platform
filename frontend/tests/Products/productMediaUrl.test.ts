import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildProductMediaUrl,
  getConfiguredProductMediaBaseUrl,
  isStagingBlobKey,
} from '../../src/utils/productMediaUrl'

describe('Products / productMediaUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('buildProductMediaUrl joins base and key without duplicate slashes', () => {
    const url = buildProductMediaUrl('products/abc/photo.webp', 'https://cdn.example.com/media/')
    expect(url).toBe('https://cdn.example.com/media/products/abc/photo.webp')
  })

  it('isStagingBlobKey detects staging paths', () => {
    expect(isStagingBlobKey('products/staging/user-id/file.webp')).toBe(true)
    expect(isStagingBlobKey('products/222/file.webp')).toBe(false)
  })

  it('getConfiguredProductMediaBaseUrl reads VITE_PRODUCT_MEDIA_BASE_URL', () => {
    vi.stubEnv('VITE_PRODUCT_MEDIA_BASE_URL', 'https://blob.example.com/photos/')
    expect(getConfiguredProductMediaBaseUrl()).toBe('https://blob.example.com/photos')
  })
})
