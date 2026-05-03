import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})

// The ReturnType<typeof store.getState> function is used to get the type of the root state.
export type RootState = ReturnType<typeof store.getState>
// The AppDispatch type is used to dispatch actions to the store.
export type AppDispatch = typeof store.dispatch
