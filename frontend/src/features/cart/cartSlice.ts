import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { CartLine, CartState } from './cartTypes'

const CART_KEY = 'mse_cart_v1'

function loadInitial(): CartState {
  if (typeof window === 'undefined') {
    return { items: [] }
  }
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    if (!raw) {
      return { items: [] }
    }
    const parsed = JSON.parse(raw) as { items?: CartLine[] }
    if (!Array.isArray(parsed?.items)) {
      return { items: [] }
    }
    return { items: parsed.items }
  } catch {
    return { items: [] }
  }
}

const initialState: CartState = loadInitial()

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        product: Pick<CartLine, 'productId' | 'sku' | 'name' | 'unitPrice'>
        quantity?: number
        maxQuantity?: number
      }>,
    ) => {
      const q = action.payload.quantity ?? 1
      const max = action.payload.maxQuantity
      const add = max === undefined ? q : Math.min(q, Math.max(0, max))
      if (add < 1) {
        return
      }
      const existing = state.items.find((i) => i.productId === action.payload.product.productId)
      if (existing) {
        let next = existing.quantity + add
        if (max !== undefined) {
          next = Math.min(next, max)
        }
        existing.quantity = next
      } else {
        state.items.push({
          ...action.payload.product,
          quantity: max !== undefined ? Math.min(add, max) : add,
        })
      }
    },
    setLineQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number; maxQuantity?: number }>,
    ) => {
      const line = state.items.find((i) => i.productId === action.payload.productId)
      if (!line) {
        return
      }
      let q = action.payload.quantity
      if (action.payload.maxQuantity !== undefined) {
        q = Math.min(q, action.payload.maxQuantity)
      }
      if (q < 1) {
        state.items = state.items.filter((i) => i.productId !== action.payload.productId)
      } else {
        line.quantity = q
      }
    },
    removeLine: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload)
    },
    clearCart: (state) => {
      state.items = []
    },
    hydrateCart: (_state, action: PayloadAction<CartState>) => action.payload,
  },
})

export const { addToCart, setLineQuantity, removeLine, clearCart, hydrateCart } = cartSlice.actions

export function persistCartState(state: CartState) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export function readPersistedCart(): CartState {
  return loadInitial()
}
