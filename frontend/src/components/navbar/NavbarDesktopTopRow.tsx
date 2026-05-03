import { Link } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import BrandMark from '../BrandMark'
import { NavbarUserMenu } from './NavbarUserMenu'

type NavbarDesktopTopRowProps = {
  cartCount: number
  wishlistCount: number
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSearchSubmit: () => void
  isSearchSubmitting: boolean
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

export function NavbarDesktopTopRow({
  cartCount,
  wishlistCount,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  isSearchSubmitting,
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
}: NavbarDesktopTopRowProps) {
  return (
    <div className="mx-auto w-full max-w-7xl pt-3">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 lg:gap-x-3 xl:gap-x-4">
        <Link to="/" className="flex shrink-0 items-center justify-self-start" aria-label="Multi-Store-Ecommerce-Platform Home">
          <BrandMark />
          <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
        </Link>

        <div className="inline-flex min-h-9 min-w-0 w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 lg:min-h-8 lg:gap-1 lg:px-1.5 lg:py-1 xl:min-h-9 xl:gap-1.5 xl:px-2 xl:py-1">
          <FiSearch className="h-3.5 w-3.5 shrink-0 text-slate-500 lg:h-3.5 lg:w-3.5 xl:h-4 xl:w-4" aria-hidden="true" />
          <input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearchSubmit()
              }
            }}
            placeholder="Enter product name"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 xl:text-sm"
            aria-label="Search products"
          />
          <button
            type="button"
            onClick={onSearchSubmit}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[0.65rem] font-medium text-white hover:bg-sky-700 lg:px-2 lg:py-1 lg:text-xs xl:gap-1.5 xl:px-3 xl:py-1.5 xl:text-xs"
            aria-busy={isSearchSubmitting}
          >
            {isSearchSubmitting ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-white" aria-hidden="true" />
            ) : null}
            Search
          </button>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 justify-self-end">
          <Link
            to="/cart"
            className="relative inline-flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label={cartCount > 0 ? `Shopping cart, ${cartCount} items` : 'Shopping cart'}
          >
            Cart
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>
          <Link
            to="/wishlist"
            className="relative inline-flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
          >
            Wishlist
            {wishlistCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold leading-none text-white">
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
            signInClassName="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
          />
        </div>
      </div>
    </div>
  )
}
