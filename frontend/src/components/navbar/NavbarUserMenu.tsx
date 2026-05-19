import { Link } from 'react-router-dom'
import { canAccessDashboard } from '../../features/auth/authConstants'
import { AccountMenuGridIcon } from './AccountMenuGridIcon'
import { UserProfileMenuPanel } from './UserProfileMenuPanel'

type NavbarUserMenuProps = {
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
  role?: string
  initials: string
  avatarImageUrl?: string | null
  isAvatarBusy?: boolean
  isSessionLoading?: boolean
  isUserMenuOpen: boolean
  onToggleUserMenu: () => void
  onCloseUserMenu: () => void
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
  isSessionLoading = false,
  isUserMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
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
          className="relative inline-flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-md border border-slate-200 px-2 text-slate-700 transition hover:bg-slate-50 hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
          aria-busy={isAvatarBusy || isSessionLoading}
          aria-label={userEmail ? `Open account menu for ${userEmail}` : 'Open account menu'}
          disabled={isSigningOut}
        >
          <AccountMenuGridIcon isBusy={isAvatarBusy || isSessionLoading} />
        </button>
        {isUserMenuOpen ? (
          <UserProfileMenuPanel
            isOpen={isUserMenuOpen}
            firstName={firstName}
            lastName={lastName}
            userEmail={userEmail}
            role={role}
            initials={initials}
            avatarImageUrl={avatarImageUrl}
            showDashboardLink={showDashboardLink}
            isSessionLoading={isSessionLoading}
            isAvatarBusy={isAvatarBusy}
            isSigningOut={isSigningOut}
            onCloseMenu={onCloseUserMenu}
            onSignOut={onSignOut}
          />
        ) : null}
      </div>
    )
  }

  return (
    <Link to="/signin" className={signInClassName}>
      Sign In
    </Link>
  )
}
