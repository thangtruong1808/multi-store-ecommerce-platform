import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiLogOut, FiSave } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearAuthErrors, logoutUser, updateProfile } from '../features/auth/authSlice'

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= 8, 'Mobile must be at least 8 characters'),
  avatarS3Key: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  currentPassword: z.string().trim().optional(),
  newPassword: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= 8, 'New password must be at least 8 characters'),
}).superRefine((value, ctx) => {
  const hasCurrent = Boolean(value.currentPassword?.trim())
  const hasNew = Boolean(value.newPassword?.trim())

  if (hasCurrent && !hasNew) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['newPassword'],
      message: 'New password is required when current password is entered.',
    })
  }

  if (!hasCurrent && hasNew) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['currentPassword'],
      message: 'Current password is required to change password.',
    })
  }
})

type ProfileForm = z.infer<typeof profileSchema>

function ProfilePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user, actionLoading, error, fieldErrors } = useAppSelector((state) => state.auth)
  const [formData, setFormData] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    avatarS3Key: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    currentPassword: '',
    newPassword: '',
  })
  const [clientErrors, setClientErrors] = useState<Record<string, string | undefined>>({})
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setFormData({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      mobile: user.mobile ?? '',
      avatarS3Key: user.avatarS3Key ?? '',
      addressLine1: user.addressLine1 ?? '',
      addressLine2: user.addressLine2 ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      postalCode: user.postalCode ?? '',
      country: user.country ?? '',
      currentPassword: '',
      newPassword: '',
    })
  }, [user])

  const mergedErrors = useMemo(() => ({ ...fieldErrors, ...clientErrors }), [fieldErrors, clientErrors])
  const baselineFormData = useMemo<ProfileForm>(
    () => ({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      mobile: user?.mobile ?? '',
      avatarS3Key: user?.avatarS3Key ?? '',
      addressLine1: user?.addressLine1 ?? '',
      addressLine2: user?.addressLine2 ?? '',
      city: user?.city ?? '',
      state: user?.state ?? '',
      postalCode: user?.postalCode ?? '',
      country: user?.country ?? '',
      currentPassword: '',
      newPassword: '',
    }),
    [user],
  )
  const hasFormChanges = useMemo(
    () =>
      formData.firstName !== baselineFormData.firstName ||
      formData.lastName !== baselineFormData.lastName ||
      formData.email !== baselineFormData.email ||
      formData.mobile !== baselineFormData.mobile ||
      formData.avatarS3Key !== baselineFormData.avatarS3Key ||
      formData.addressLine1 !== baselineFormData.addressLine1 ||
      formData.addressLine2 !== baselineFormData.addressLine2 ||
      formData.city !== baselineFormData.city ||
      formData.state !== baselineFormData.state ||
      formData.postalCode !== baselineFormData.postalCode ||
      formData.country !== baselineFormData.country ||
      formData.currentPassword !== '' ||
      formData.newPassword !== '',
    [formData, baselineFormData],
  )

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setClientErrors((prev) => ({ ...prev, [name]: undefined }))
    setSaveSuccessMessage(null)
    dispatch(clearAuthErrors())
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return previewUrl
    })

    setFormData((prev) => ({ ...prev, avatarS3Key: `local-upload/${file.name}` }))
    setClientErrors((prev) => ({ ...prev, avatarS3Key: undefined }))
    setSaveSuccessMessage(null)
    dispatch(clearAuthErrors())
  }

  const onLogout = async () => {
    const result = await dispatch(logoutUser())
    if (logoutUser.fulfilled.match(result)) {
      navigate('/signin', { replace: true })
    }
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasFormChanges) return

    const parsed = profileSchema.safeParse(formData)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key) nextErrors[key] = issue.message
      }
      setClientErrors(nextErrors)
      setSaveSuccessMessage(null)
      return
    }

    setSaveSuccessMessage(null)
    const result = await dispatch(updateProfile(parsed.data))
    if (updateProfile.fulfilled.match(result)) {
      setClientErrors({})
      setSaveSuccessMessage('Profile saved successfully.')
      setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '' }))
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-4xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
      <p className="mt-2 text-sm text-slate-600">Update your profile details and contact information.</p>
      {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saveSuccessMessage && (
        <div className="mt-4 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9.25 10.69 7.28 8.72a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l3.999-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-slate-700">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
            {mergedErrors.firstName && <p className="mt-1 text-xs text-red-600">{mergedErrors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-slate-700">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
            {mergedErrors.lastName && <p className="mt-1 text-xs text-red-600">{mergedErrors.lastName}</p>}
          </div>
        </div>

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
          />
          {mergedErrors.email && <p className="mt-1 text-xs text-red-600">{mergedErrors.email}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
            {mergedErrors.mobile && <p className="mt-1 text-xs text-red-600">{mergedErrors.mobile}</p>}
          </div>
          <div>
            <label htmlFor="avatarImage" className="mb-1 block text-sm font-medium text-slate-700">
              Choose an image from local <span className="text-slate-400">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-100">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-6 w-6 text-slate-400"
                    aria-hidden="true"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 16.042A8 8 0 1119.542 16.042A8.97 8.97 0 0010 14a8.97 8.97 0 00-9.542 2.042z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <input
                id="avatarImage"
                name="avatarImage"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{formData.avatarS3Key ? `Selected: ${formData.avatarS3Key}` : 'No file selected'}</p>
            {mergedErrors.avatarS3Key && <p className="mt-1 text-xs text-red-600">{mergedErrors.avatarS3Key}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium text-slate-700">
              Address Line 1 <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="addressLine1"
              name="addressLine1"
              type="text"
              value={formData.addressLine1}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="addressLine2" className="mb-1 block text-sm font-medium text-slate-700">
              Address Line 2 <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="addressLine2"
              name="addressLine2"
              type="text"
              value={formData.addressLine2}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-slate-700">
              City <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="state" className="mb-1 block text-sm font-medium text-slate-700">
              State <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-slate-700">
              Postal Code <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700">
              Country <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="country"
              name="country"
              type="text"
              value={formData.country}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-800">Change Password</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
                Current Password <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              />
              {mergedErrors.currentPassword && <p className="mt-1 text-xs text-red-600">{mergedErrors.currentPassword}</p>}
            </div>
            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
                New Password <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-slate-200 focus:ring"
              />
              {mergedErrors.newPassword && <p className="mt-1 text-xs text-red-600">{mergedErrors.newPassword}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={actionLoading || !hasFormChanges}
            className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {actionLoading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            <FiSave className="h-4 w-4" aria-hidden="true" />
            {actionLoading ? 'Saving...' : 'Save Profile'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            disabled={actionLoading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="inline-flex items-center gap-2">
              <FiLogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfilePage
