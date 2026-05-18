export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

export const AUTH_SESSION_HINT_KEY = 'auth_session_hint'

/** Matches backend dashboard access and <AdminRoute /> — admin and store_manager only. */
export function canAccessDashboard(role?: string | null): boolean {
  return role === 'admin' || role === 'store_manager'
}
