import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

const parseErrorPayload = async (response, fallbackMessage) => {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  return {
    message: payload?.message ?? fallbackMessage,
    errors: payload?.errors ?? {},
    status: response.status,
  }
}

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, thunkAPI) => {
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
        return null
      }
      return thunkAPI.rejectWithValue(
        await parseErrorPayload(response, `Unable to fetch current user: ${response.status}`),
      )
    }

    return await response.json()
  } catch (error) {
    return thunkAPI.rejectWithValue({
      message: error.message ?? 'Failed to fetch current user',
      errors: {},
    })
  }
})

export const signIn = createAsyncThunk('auth/signIn', async (body, thunkAPI) => {
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

    const data = await response.json()
    return data.user
  } catch (error) {
    return thunkAPI.rejectWithValue({
      message: error.message ?? 'Unable to sign in',
      errors: {},
    })
  }
})

export const registerUser = createAsyncThunk('auth/registerUser', async (body, thunkAPI) => {
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
        loginResult.payload ?? { message: 'Registration succeeded but auto sign-in failed', errors: {} },
      )
    }

    return loginResult.payload
  } catch (error) {
    return thunkAPI.rejectWithValue({
      message: error.message ?? 'Unable to register account',
      errors: {},
    })
  }
})

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, thunkAPI) => {
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

    return true
  } catch (error) {
    return thunkAPI.rejectWithValue({
      message: error.message ?? 'Unable to log out',
      errors: {},
    })
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    actionLoading: false,
    isHydrated: false,
    error: null,
    fieldErrors: {},
  },
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
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload?.message ?? 'Logout failed'
      })
  },
})

export const { clearAuthState, clearAuthErrors } = authSlice.actions
export default authSlice.reducer
