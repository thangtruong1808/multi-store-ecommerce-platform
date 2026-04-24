import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { clearAuthErrors, signIn } from '../features/auth/authSlice'

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function SignInPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, error, fieldErrors } = useSelector((state) => state.auth)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [clientErrors, setClientErrors] = useState({})

  const mergedErrors = useMemo(() => ({ ...fieldErrors, ...clientErrors }), [fieldErrors, clientErrors])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setClientErrors((prev) => ({ ...prev, [name]: undefined }))
    dispatch(clearAuthErrors())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const parsed = signInSchema.safeParse(formData)
    if (!parsed.success) {
      const nextErrors = {}
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path[0]] = issue.message
      }
      setClientErrors(nextErrors)
      return
    }

    const result = await dispatch(signIn(parsed.data))
    if (signIn.fulfilled.match(result)) {
      navigate('/')
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
      <p className="mt-1 text-sm text-slate-600">Access your dashboard and store management tools.</p>

      {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {mergedErrors.email && <p className="mt-1 text-xs text-red-600">{mergedErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {mergedErrors.password && <p className="mt-1 text-xs text-red-600">{mergedErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={actionLoading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {actionLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        New account?{' '}
        <Link to="/register" className="font-medium text-slate-900 underline">
          Register here
        </Link>
      </p>
    </div>
  )
}

export default SignInPage
