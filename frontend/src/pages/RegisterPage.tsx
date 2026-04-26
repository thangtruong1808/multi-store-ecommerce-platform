import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiLock, FiMail, FiPhone, FiUser, FiUserPlus } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearAuthErrors, registerUser } from '../features/auth/authSlice'

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    mobile: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length >= 8, 'Mobile must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile: string
  confirmPassword: string
}

function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, error, fieldErrors } = useAppSelector((state) => state.auth)
  const [formData, setFormData] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    mobile: '',
    confirmPassword: '',
  })
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({})

  const mergedErrors = useMemo(() => ({ ...fieldErrors, ...clientErrors }), [fieldErrors, clientErrors])
  const isSubmitting = actionLoading

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
    if (isSubmitting) {
      return
    }
    const parsed = registerSchema.safeParse(formData)
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

    const result = await dispatch(
      registerUser({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
        mobile: parsed.data.mobile,
      }),
    )
    if (registerUser.fulfilled.match(result)) {
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
          <FiUserPlus className="h-6 w-6 text-sky-600" aria-hidden="true" />
          Register
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">Create your account and ready for shopping!</p>

        {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                <FiUser className="h-4 w-4 text-slate-500" aria-hidden="true" />
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
                placeholder="Thang"
                autoComplete="given-name"
              />
              {mergedErrors.firstName && <p className="mt-1 text-xs text-red-600">{mergedErrors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                <FiUser className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
                placeholder="Truong"
                autoComplete="family-name"
              />
              {mergedErrors.lastName && <p className="mt-1 text-xs text-red-600">{mergedErrors.lastName}</p>}
            </div>
          </div>

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
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              placeholder="your@example.com"
              autoComplete="email"
            />
            {mergedErrors.email && <p className="mt-1 text-xs text-red-600">{mergedErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiLock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              placeholder="Choose a strong password"
              autoComplete="new-password"
            />
            {mergedErrors.password && <p className="mt-1 text-xs text-red-600">{mergedErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="mobile" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiPhone className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Mobile <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              placeholder="04xx xxx xxx"
              autoComplete="tel"
            />
            {mergedErrors.mobile && <p className="mt-1 text-xs text-red-600">{mergedErrors.mobile}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiCheckCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {mergedErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{mergedErrors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            <FiUserPlus className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Creating account...' : 'Create Account'}
            {isSubmitting && <span className="sr-only">Registration in progress</span>}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/signin" className="font-medium text-sky-700 underline hover:text-sky-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
