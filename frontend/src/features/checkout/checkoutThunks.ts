import { createAsyncThunk } from '@reduxjs/toolkit'

import { API_BASE_URL } from '../auth/authConstants'
import { refreshAccessToken } from '../auth/refreshAccessToken'
import type { RootState } from '../../app/store'

type SessionResponse = { url?: string }

export const createCheckoutSession = createAsyncThunk<string, string, { rejectValue: string }>(
  'checkout/createSession',
  async (storeId, { getState, rejectWithValue }) => {
    const state = getState() as RootState
    const items = state.cart.items
    if (items.length === 0) {
      return rejectWithValue('Your cart is empty.')
    }

    if (!storeId.trim()) {
      return rejectWithValue('Choose a store to fulfil your order.')
    }

    const body = {
      storeId,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    }

    const post = async () =>
      fetch(`${API_BASE_URL}/api/checkout/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

    let response = await post()
    if (response.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        response = await post()
      }
    }

    if (response.status === 401) {
      return rejectWithValue('Please sign in to check out.')
    }
    if (!response.ok) {
      let message = 'Checkout failed.'
      try {
        const j = (await response.json()) as { message?: string }
        if (j.message) {
          message = j.message
        }
      } catch {
        /* ignore */
      }
      return rejectWithValue(message)
    }

    const data = (await response.json()) as SessionResponse
    const url = data.url
    if (!url) {
      return rejectWithValue('No payment URL returned.')
    }

    return url
  },
)
