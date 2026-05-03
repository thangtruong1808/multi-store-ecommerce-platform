import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type WishlistState = {
  /** Distinct product IDs saved locally (guest or cache). */
  ids: string[]
}

const WISHLIST_KEY = 'mse_wishlist_ids_v1'

function loadInitial(): WishlistState {
  if (typeof window === 'undefined') {
    return { ids: [] }
  }
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY)
    if (!raw) {
      return { ids: [] }
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return { ids: [] }
    }
    const ids = parsed.filter((x): x is string => typeof x === 'string')
    return { ids: [...new Set(ids)] }
  } catch {
    return { ids: [] }
  }
}

const initialState: WishlistState = loadInitial()

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlistProduct: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((x) => x !== id)
      } else {
        state.ids.push(id)
      }
    },
    addWishlistProduct: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (!state.ids.includes(id)) {
        state.ids.push(id)
      }
    },
    removeWishlistProduct: (state, action: PayloadAction<string>) => {
      state.ids = state.ids.filter((x) => x !== action.payload)
    },
    setWishlistIds: (state, action: PayloadAction<string[]>) => {
      state.ids = [...new Set(action.payload)]
    },
    mergeWishlistIds: (state, action: PayloadAction<string[]>) => {
      const next = new Set(state.ids)
      for (const id of action.payload) {
        next.add(id)
      }
      state.ids = [...next]
    },
  },
})

export const {
  toggleWishlistProduct,
  addWishlistProduct,
  removeWishlistProduct,
  setWishlistIds,
  mergeWishlistIds,
} = wishlistSlice.actions

export function persistWishlistState(state: WishlistState) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(state.ids))
  } catch {
    /* ignore */
  }
}
