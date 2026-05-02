import { createAsyncThunk } from '@reduxjs/toolkit'

import { API_BASE_URL, AUTH_SESSION_HINT_KEY } from './authConstants'
import { getErrorMessage, parseErrorPayload } from './authErrorUtils'
import type { ApiErrorPayload, AuthUser } from './authTypes'
import { refreshAccessToken } from './refreshAccessToken'

type AuthRequestBody = {
  email: string
  password: string
}

type RegisterRequestBody = {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile?: string
}

type UpdateProfileRequestBody = {
  firstName: string
  lastName: string
  email: string
  mobile?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  avatarS3Key?: string
  currentPassword?: string
  newPassword?: string
}

export const fetchCurrentUser = createAsyncThunk<AuthUser | null, void, { rejectValue: ApiErrorPayload }>(
  'auth/fetchCurrentUser',
  async (_, thunkAPI) => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(AUTH_SESSION_HINT_KEY) !== '1') {
      return null
    }

    try {
      // Hydrate cookies before `/me`: expired access JWT yields a noisy 401 in DevTools.
      await refreshAccessToken()

      let response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await refreshAccessToken()
          if (refreshed) {
            response = await fetch(`${API_BASE_URL}/api/auth/me`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            if (response.ok) {
              return (await response.json()) as AuthUser
            }
          }
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
          }
          return null
        }
        return thunkAPI.rejectWithValue(
          await parseErrorPayload(response, `Unable to fetch current user: ${response.status}`),
        )
      }

      return (await response.json()) as AuthUser
    } catch (error) {
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, 'Failed to fetch current user'),
        errors: {},
      })
    }
  },
)

export const signIn = createAsyncThunk<AuthUser, AuthRequestBody, { rejectValue: ApiErrorPayload }>(
  'auth/signIn',
  async (body, thunkAPI) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return thunkAPI.rejectWithValue(await parseErrorPayload(response, 'Unable to sign in'))
      }

      const data = (await response.json()) as { user: AuthUser }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1')
      }
      return data.user
    } catch (error) {
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, 'Unable to sign in'),
        errors: {},
      })
    }
  },
)

export const registerUser = createAsyncThunk<AuthUser, RegisterRequestBody, { rejectValue: ApiErrorPayload }>(
  'auth/registerUser',
  async (body, thunkAPI) => {
    try {
      const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!registerResponse.ok) {
        return thunkAPI.rejectWithValue(
          await parseErrorPayload(registerResponse, 'Unable to register account'),
        )
      }

      const loginResult = await thunkAPI.dispatch(signIn({ email: body.email, password: body.password }))
      if (signIn.rejected.match(loginResult)) {
        return thunkAPI.rejectWithValue(
          (loginResult.payload as ApiErrorPayload | undefined) ?? {
            message: 'Registration succeeded but auto sign-in failed',
            errors: {},
          },
        )
      }

      return (loginResult.payload as AuthUser) ?? null
    } catch (error) {
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, 'Unable to register account'),
        errors: {},
      })
    }
  },
)

export const logoutUser = createAsyncThunk<boolean, void, { rejectValue: ApiErrorPayload }>(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return thunkAPI.rejectWithValue(await parseErrorPayload(response, 'Unable to log out'))
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_SESSION_HINT_KEY)
      }
      return true
    } catch (error) {
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, 'Unable to log out'),
        errors: {},
      })
    }
  },
)

export const updateProfile = createAsyncThunk<AuthUser, UpdateProfileRequestBody, { rejectValue: ApiErrorPayload }>(
  'auth/updateProfile',
  async (body, thunkAPI) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return thunkAPI.rejectWithValue(await parseErrorPayload(response, 'Unable to update profile'))
      }

      return (await response.json()) as AuthUser
    } catch (error) {
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, 'Unable to update profile'),
        errors: {},
      })
    }
  },
)
