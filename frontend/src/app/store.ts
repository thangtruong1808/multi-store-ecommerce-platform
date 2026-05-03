import { configureStore } from '@reduxjs/toolkit'
import type { Middleware } from '@reduxjs/toolkit'

import authReducer from '../features/auth/authSlice'
import { cartSlice, persistCartState } from '../features/cart/cartSlice'
import { wishlistSlice, persistWishlistState } from '../features/wishlist/wishlistSlice'

const persistCatalogMiddleware: Middleware =
  (store) => (next) => (action: unknown) => {
    const result = next(action)
    const type = typeof action === 'object' && action !== null && 'type' in action ? String((action as { type: string }).type) : ''
    const state = store.getState()
    if (type.startsWith('cart/')) {
      persistCartState(state.cart)
    }
    if (type.startsWith('wishlist/')) {
      persistWishlistState(state.wishlist)
    }
    return result
  }

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistCatalogMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
