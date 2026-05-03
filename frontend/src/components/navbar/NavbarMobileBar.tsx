import { Link } from 'react-router-dom'
import { FiHeart, FiShoppingCart } from 'react-icons/fi'
import BrandMark from '../BrandMark'
import { NavbarUserMenu } from './NavbarUserMenu'

type NavbarMobileBarProps = {
  isMobileNavOpen: boolean
  onToggleMobileNav: () => void
  cartCount: number
  wishlistCount: number
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
  role?: string
  initials: string
  isUserMenuOpen: boolean
  onToggleUserMenu: () => void
  isSigningOut: boolean
  onSignOut: () => void
}

export function NavbarMobileBar({
  isMobileNavOpen,
  onToggleMobileNav,
  cartCount,
  wishlistCount,
  isAuthenticated,
  userEmail,
  firstName,
  lastName,
  role,
  initials,
  isUserMenuOpen,
  onToggleUserMenu,
  isSigningOut,
  onSignOut,
}: NavbarMobileBarProps) {
  return (
    <div className="flex items-center justify-between gap-x-3 gap-y-2 py-3 lg:hidden">
      <Link to="/" className="flex min-w-0 shrink-0 items-center" aria-label="Multi-Store-Ecommerce-Platform Home">
        <BrandMark />
        <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
      </Link>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <Link
          to="/cart"
          className="relative inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 px-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          aria-label={cartCount > 0 ? `Shopping cart, ${cartCount} items` : 'Shopping cart'}
        >
          <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-sky-600 px-0.5 text-[9px] font-bold leading-none text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </Link>
        <Link
          to="/wishlist"
          className="relative inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 px-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
        >
          <FiHeart className="h-4 w-4 shrink-0" aria-hidden="true" />
          {wishlistCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-sky-600 px-0.5 text-[9px] font-bold leading-none text-white">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          ) : null}
        </Link>
        <NavbarUserMenu
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          firstName={firstName}
          lastName={lastName}
          role={role}
          initials={initials}
          isUserMenuOpen={isUserMenuOpen}
          onToggleUserMenu={onToggleUserMenu}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
          signInClassName="shrink-0 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs text-white hover:bg-sky-700 sm:px-3 sm:text-sm"
        />
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={onToggleMobileNav}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-primary-nav"
          aria-label="Toggle navigation menu"
        >
          <span className="text-lg">{isMobileNavOpen ? '×' : '☰'}</span>
        </button>
      </div>
    </div>
  )
}
