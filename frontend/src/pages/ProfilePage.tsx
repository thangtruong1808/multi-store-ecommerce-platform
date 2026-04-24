import { Navigate, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logoutUser } from '../features/auth/authSlice'

function ProfilePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user, actionLoading, error } = useAppSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  const onLogout = async () => {
    const result = await dispatch(logoutUser())
    if (logoutUser.fulfilled.match(result)) {
      navigate('/signin', { replace: true })
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">Manage your authenticated session.</p>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Signed in as</p>
        <p className="mt-1 text-base font-medium text-slate-900">{user?.email ?? 'Unknown user'}</p>
      </div>

      {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onLogout}
        disabled={actionLoading}
        className="mt-6 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {actionLoading ? 'Logging out...' : 'Log out'}
      </button>
    </div>
  )
}

export default ProfilePage
