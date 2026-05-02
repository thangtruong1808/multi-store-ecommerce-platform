import { createSlice } from '@reduxjs/toolkit'

import { AUTH_SESSION_HINT_KEY } from './authConstants'
import {
  fetchCurrentUser,
  logoutUser,
  registerUser,
  signIn,
  updateProfile,
} from './authThunks'
import type { AuthState } from './authTypes'

export type { ApiErrorPayload, AuthUser } from './authTypes'
export {
  fetchCurrentUser,
  logoutUser,
  registerUser,
  signIn,
  updateProfile,
} from './authThunks'

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  actionLoading: false,
  isHydrated: false,
  error: null,
  fieldErrors: {},
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthState: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.error = null
      state.fieldErrors = {}
    },
    clearAuthErrors: (state) => {
      state.error = null
      state.fieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isHydrated = true
        state.user = action.payload
        state.isAuthenticated = Boolean(action.payload)
        if (!action.payload && typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false
        state.isHydrated = true
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload?.message ?? 'Failed to hydrate auth session'
      })
      .addCase(signIn.pending, (state) => {
        state.actionLoading = true
        state.error = null
        state.fieldErrors = {}
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.actionLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signIn.rejected, (state, action) => {
        state.actionLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload?.message ?? 'Sign in failed'
        state.fieldErrors = action.payload?.errors ?? {}
      })
      .addCase(registerUser.pending, (state) => {
        state.actionLoading = true
        state.error = null
        state.fieldErrors = {}
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.actionLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload?.message ?? 'Registration failed'
        state.fieldErrors = action.payload?.errors ?? {}
      })
      .addCase(logoutUser.pending, (state) => {
        state.actionLoading = true
        state.error = null
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.actionLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
        state.fieldErrors = {}
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
        }
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload?.message ?? 'Logout failed'
      })
      .addCase(updateProfile.pending, (state) => {
        state.actionLoading = true
        state.error = null
        state.fieldErrors = {}
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.actionLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload?.message ?? 'Profile update failed'
        state.fieldErrors = action.payload?.errors ?? {}
      })
  },
})

export const { clearAuthState, clearAuthErrors } = authSlice.actions
export default authSlice.reducer
