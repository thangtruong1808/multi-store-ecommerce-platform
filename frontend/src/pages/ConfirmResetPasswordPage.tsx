import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { FiCheckCircle, FiKey, FiLock } from 'react-icons/fi'
import { useAppSelector } from '../app/hooks'
import { AuthFormSpinner } from '../components/auth/AuthFormSpinner'
import { confirmPasswordReset } from '../features/auth/passwordResetApi'

const confirmResetSchema = z
  .object({
    newPassword: z.string().trim().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().trim().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

function ConfirmResetPasswordPage() {
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!token) {
      setError('This reset link is invalid. Request a new link from the reset password page.')
      return
    }

    const parsed = confirmResetSchema.safeParse({ newPassword, confirmPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your password fields')
      return
    }

    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, parsed.data.newPassword)
      setSuccess('Password updated. You can sign in with your new password.')
      setNewPassword('')
      setConfirmPassword('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <FiKey className="h-6 w-6 text-sky-600" aria-hidden="true" />
            Set new password
          </h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password for your account</p>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600">This reset link is missing or invalid.</p>
            <Link to="/reset-password" className="text-sm font-medium text-sky-700 underline hover:text-sky-800">
              Request a new reset link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-emerald-700">{success}</p>
            <Link
              to="/signin"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            <div>
              <label htmlFor="newPassword" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                <FiLock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setError(null)
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 pr-16 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                <FiLock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError(null)
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 pr-16 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <AuthFormSpinner />}
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Updating password...' : 'Update password'}
              {isSubmitting && <span className="sr-only">Update in progress</span>}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-slate-600">
          <Link to="/reset-password" className="font-medium text-sky-700 hover:text-sky-800">
            Request another reset link
          </Link>
          {' · '}
          <Link to="/signin" className="font-medium text-sky-700 hover:text-sky-800">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ConfirmResetPasswordPage
