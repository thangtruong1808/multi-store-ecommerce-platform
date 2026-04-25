import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
const AUTH_SESSION_HINT_KEY = 'auth_session_hint'

export type AuthUser = {
  id?: string
  role?: string
  firstName?: string
  lastName?: string
  avatarS3Key?: string
  email?: string
  mobile?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type ApiErrorPayload = {
  message: string
  errors: Record<string, string>
  status?: number
}

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

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  actionLoading: boolean
  isHydrated: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const parseErrorPayload = async (
  response: Response,
  fallbackMessage: string,
): Promise<ApiErrorPayload> => {
  let payload: { message?: string; errors?: Record<string, string> } | null = null
  try {
    payload = (await response.json()) as { message?: string; errors?: Record<string, string> }
  } catch {
    payload = null
  }

  return {
    message: payload?.message ?? fallbackMessage,
    errors: payload?.errors ?? {},
    status: response.status,
  }
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export const fetchCurrentUser = createAsyncThunk<AuthUser | null, void, { rejectValue: ApiErrorPayload }>(
  'auth/fetchCurrentUser',
  async (_, thunkAPI) => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(AUTH_SESSION_HINT_KEY) !== '1') {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
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
