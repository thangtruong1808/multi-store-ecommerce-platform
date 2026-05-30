import { describe, expect, it } from 'vitest'

import { cartSlice } from '../../src/features/cart/cartSlice'

describe('Cart / cartSlice', () => {
  it('addToCart merges quantity for the same product', () => {
    const state = cartSlice.reducer(
      { items: [] },
      cartSlice.actions.addToCart({
        product: {
          productId: 'p1',
          sku: 'SKU-1',
          name: 'Widget',
          unitPrice: 10,
        },
        quantity: 2,
      }),
    )

    const next = cartSlice.reducer(
      state,
      cartSlice.actions.addToCart({
        product: {
          productId: 'p1',
          sku: 'SKU-1',
          name: 'Widget',
          unitPrice: 10,
        },
        quantity: 3,
      }),
    )

    expect(next.items).toHaveLength(1)
    expect(next.items[0]?.quantity).toBe(5)
  })
})
