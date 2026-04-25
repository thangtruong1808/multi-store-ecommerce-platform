import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiLock, FiMail, FiShield } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearAuthErrors, signIn } from '../features/auth/authSlice'

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignInForm = {
  email: string
  password: string
}

function SignInPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, error, fieldErrors } = useAppSelector((state) => state.auth)
  const [formData, setFormData] = useState<SignInForm>({ email: '', password: '' })
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({})
  const [showPassword, setShowPassword] = useState(false)

  const mergedErrors = useMemo(
    () => ({ ...fieldErrors, ...clientErrors }),
    [fieldErrors, clientErrors],
  )

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setClientErrors((prev) => ({ ...prev, [name]: undefined }))
    dispatch(clearAuthErrors())
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = signInSchema.safeParse(formData)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const pathKey = String(issue.path[0] ?? '')
        if (pathKey) {
          nextErrors[pathKey] = issue.message
        }
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <FiShield className="h-6 w-6 text-sky-600" aria-hidden="true" />
            Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back</p>
        </div>


        {error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form className="mt-2 space-y-3" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiMail className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {mergedErrors.email && (
              <p className="mt-1 text-xs text-red-600">{mergedErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiLock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 pr-16 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {mergedErrors.password && (
              <p className="mt-1 text-xs text-red-600">{mergedErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {actionLoading && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
            {actionLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New account?{' '}
          <Link to="/register" className="font-medium text-sky-700 underline hover:text-sky-800">
            Register here
          </Link>
        </p>
        <p className="mt-2 text-sm">
          <Link to="/reset-password" className="font-medium text-sky-700 hover:text-sky-800">
            Forgot password? Reset here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default SignInPage
