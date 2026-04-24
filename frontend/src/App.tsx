import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { fetchCurrentUser } from './features/auth/authSlice'
import Navbar from './components/Navbar'
import SignInPage from './pages/SignInPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'

function HomePage() {
  // Redux auth state
  const { user, isAuthenticated, isLoading, isHydrated, error } = useAppSelector((state) => state.auth)

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">Multi-Store-Ecommerce-Platform</h1>
      <p className="mt-3 text-base text-slate-600">
        React 18 + Vite + TailwindCSS + Redux auth state are ready with C#
        backend.
      </p>
      <p className="mt-3 rounded bg-slate-100 p-3 text-sm">
        {isLoading && 'Checking login session...'}
        {!isLoading && !isHydrated && 'Preparing auth state...'}
        {!isLoading &&
          isHydrated &&
          isAuthenticated &&
          `Authenticated as ${user?.email ?? 'user'}.`}
        {!isLoading &&
          isHydrated &&
          !isAuthenticated &&
          'Not authenticated (normal for first visit).'}
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-sm text-slate-500">
        Set{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">
          VITE_API_BASE_URL
        </code>{' '}
        in{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">
          frontend/.env
        </code>{' '}
        to connect to the backend.
      </p>
    </div>
  )
}

function App() {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar isAuthenticated={isAuthenticated} userEmail={user?.email} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default App
