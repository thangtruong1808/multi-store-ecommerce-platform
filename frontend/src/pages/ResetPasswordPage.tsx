import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { FiCheckCircle, FiKey, FiMail } from 'react-icons/fi'
import { useAppSelector } from '../app/hooks'
import { AuthFormSpinner } from '../components/auth/AuthFormSpinner'
import { requestPasswordReset } from '../features/auth/passwordResetApi'

const resetPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
})

function ResetPasswordPage() {
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResetError(null)
    setResetSuccess(null)

    const parsed = resetPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setResetError(parsed.error.issues[0]?.message ?? 'Please enter a valid email')
      return
    }

    setResetLoading(true)
    try {
      await requestPasswordReset(parsed.data.email)
      setResetSuccess('If that email exists, a reset link has been sent.')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Unable to request password reset. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <FiKey className="h-6 w-6 text-sky-600" aria-hidden="true" />
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-slate-500">Enter your account email to request a reset link</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={resetLoading}>
          <div>
            <label htmlFor="resetEmail" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
              <FiMail className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Account email
            </label>
            <input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setResetError(null)
                setResetSuccess(null)
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={resetLoading}
            />
          </div>

          {resetError && <p className="text-xs text-red-600">{resetError}</p>}
          {resetSuccess && <p className="text-xs text-emerald-700">{resetSuccess}</p>}

          <button
            type="submit"
            disabled={resetLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {resetLoading && <AuthFormSpinner />}
            <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
            {resetLoading ? 'Requesting reset...' : 'Request password reset'}
            {resetLoading && <span className="sr-only">Request in progress</span>}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/signin" className="font-medium text-sky-700 underline hover:text-sky-800">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage
