import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import authReducer from '../../src/features/auth/authSlice'
import { AdminRoute } from '../../src/components/RouteGuards'
import type { AuthState } from '../../src/features/auth/authTypes'

function renderAdminRoute(auth: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        actionLoading: false,
        isHydrated: true,
        error: null,
        fieldErrors: {},
        ...auth,
      },
    },
  })

  const router = createMemoryRouter(
    [
      { path: '/', element: <div>Home page</div> },
      { path: '/signin', element: <div>Sign in page</div> },
      {
        path: '/dashboard',
        element: <AdminRoute />,
        children: [{ index: true, element: <div>Dashboard content</div> }],
      },
    ],
    { initialEntries: ['/dashboard'] },
  )

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe('Users / RouteGuards', () => {
  it('redirects unauthenticated users to sign in', async () => {
    renderAdminRoute({ isAuthenticated: false })

    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
  })

  it('redirects customers away from dashboard', async () => {
    renderAdminRoute({
      isAuthenticated: true,
      user: { role: 'customer', email: 'c@example.com' },
    })

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('allows store_manager to access dashboard outlet', async () => {
    renderAdminRoute({
      isAuthenticated: true,
      user: { role: 'store_manager', email: 'm@example.com' },
    })

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument()
  })
})
