import { createAsyncThunk } from '@reduxjs/toolkit'

import { API_BASE_URL, AUTH_SESSION_HINT_KEY } from '../auth/authConstants'
import { refreshAccessToken } from '../auth/refreshAccessToken'
import type { RootState } from '../../app/store'
import { setWishlistIds } from './wishlistSlice'

type WishlistRow = { id: string; sku: string; name: string; basePrice: number }

export const fetchAndMergeWishlist = createAsyncThunk<void, void>(
  'wishlist/fetchAndMerge',
  async (_, { getState, dispatch }) => {
    if (typeof window === 'undefined' || window.localStorage.getItem(AUTH_SESSION_HINT_KEY) !== '1') {
      return
    }

    const get = async () =>
      fetch(`${API_BASE_URL}/api/wishlist`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

    let response = await get()
    if (response.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        response = await get()
      }
    }

    if (!response.ok) {
      return
    }

    const rows = (await response.json()) as WishlistRow[]
    const fromServer = rows.map((r) => r.id)
    const local = (getState() as RootState).wishlist.ids
    const merged = [...new Set([...local, ...fromServer])]
    dispatch(setWishlistIds(merged))

    const postOne = async (pid: string) => {
      const r = await fetch(`${API_BASE_URL}/api/wishlist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: pid }),
      })
      if (r.status === 401) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          await fetch(`${API_BASE_URL}/api/wishlist`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: pid }),
          })
        }
      }
    }

    for (const id of local) {
      if (!fromServer.includes(id)) {
        await postOne(id)
      }
    }
  },
)

export const addWishlistOnServer = createAsyncThunk<void, string>('wishlist/addOnServer', async (productId) => {
  if (typeof window === 'undefined' || window.localStorage.getItem(AUTH_SESSION_HINT_KEY) !== '1') {
    return
  }

  const post = async () =>
    fetch(`${API_BASE_URL}/api/wishlist`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })

  let response = await post()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await post()
    }
  }
})

export const removeWishlistOnServer = createAsyncThunk<void, string>('wishlist/removeOnServer', async (productId) => {
  if (typeof window === 'undefined' || window.localStorage.getItem(AUTH_SESSION_HINT_KEY) !== '1') {
    return
  }

  const del = async () =>
    fetch(`${API_BASE_URL}/api/wishlist/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      credentials: 'include',
    })

  let response = await del()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await del()
    }
  }
})
