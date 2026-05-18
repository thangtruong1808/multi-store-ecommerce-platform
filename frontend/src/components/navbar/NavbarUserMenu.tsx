import { Link } from 'react-router-dom'
import { canAccessDashboard } from '../../features/auth/authConstants'
import { UserAvatarCircle } from '../auth/UserAvatarCircle'

type NavbarUserMenuProps = {
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
  role?: string
  initials: string
  avatarImageUrl?: string | null
  isAvatarBusy?: boolean
  isUserMenuOpen: boolean
  onToggleUserMenu: () => void
  isSigningOut: boolean
  onSignOut: () => void
  signInClassName: string
}

export function NavbarUserMenu({
  isAuthenticated,
  userEmail,
  firstName,
  lastName,
  role,
  initials,
  avatarImageUrl = null,
  isAvatarBusy = false,
  isUserMenuOpen,
  onToggleUserMenu,
  isSigningOut,
  onSignOut,
  signInClassName,
}: NavbarUserMenuProps) {
  const showDashboardLink = canAccessDashboard(role)

  if (isAuthenticated) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggleUserMenu}
          className="rounded-full hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          aria-expanded={isUserMenuOpen}
          aria-label={userEmail ? `Open menu for ${userEmail}` : 'Open user menu'}
        >
          <UserAvatarCircle
            imageUrl={avatarImageUrl}
            initials={initials}
            isBusy={isAvatarBusy}
            ariaLabel={userEmail ? `Profile photo for ${userEmail}` : 'Profile photo'}
          />
        </button>
        {isUserMenuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 px-4 py-3 text-sm">
              <p className="font-medium text-slate-800">{[firstName, lastName].filter(Boolean).join(' ') || 'User'}</p>
              <p className="truncate text-slate-500">{userEmail ?? 'No email'}</p>
              <p className="mt-1 text-xs text-slate-500">Role: {role ?? 'unknown'}</p>
            </div>
            <ul className="p-2 text-sm text-slate-600">
              {showDashboardLink ? (
                <li>
                  <Link to="/dashboard" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                    Dashboard
                  </Link>
                </li>
              ) : null}
              <li>
                <Link to="/profile" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/orders" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                  Order history
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  disabled={isSigningOut}
                  className="inline-flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSigningOut ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" aria-hidden="true" />
                  ) : null}
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link to="/signin" className={signInClassName}>
      Sign In
    </Link>
  )
}
