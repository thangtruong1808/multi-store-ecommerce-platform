export type AuthUser = {
  id?: string
  role?: string
  firstName?: string
  lastName?: string
  avatarS3Key?: string
  email?: string
  mobile?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type ApiErrorPayload = {
  message: string
  errors: Record<string, string>
  status?: number
}

export type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  actionLoading: boolean
  isHydrated: boolean
  error: string | null
  fieldErrors: Record<string, string>
}
