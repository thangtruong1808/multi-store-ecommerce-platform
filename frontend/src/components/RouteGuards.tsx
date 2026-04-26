import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

function RouteLoading() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
      <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
          aria-hidden="true"
        />
        Checking access...
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isHydrated, isLoading } = useAppSelector((state) => state.auth)

  if (!isHydrated || isLoading) {
    return <RouteLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return <Outlet />
}

export function AdminRoute() {
  const { isAuthenticated, isHydrated, isLoading, user } = useAppSelector((state) => state.auth)
  const role = user?.role
  const isAllowed = role === 'admin' || role === 'store_manager'

  if (!isHydrated || isLoading) {
    return <RouteLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isHydrated, isLoading } = useAppSelector((state) => state.auth)

  if (!isHydrated || isLoading) {
    return <RouteLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
