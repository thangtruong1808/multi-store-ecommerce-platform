import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'

type NavbarProps = {
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
}

function Navbar({ isAuthenticated, userEmail, firstName, lastName }: NavbarProps) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:h-24 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center" aria-label="Multi-Store-Ecommerce-Platform Home">
            <BrandMark />
            <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
            <a href="#" className="hover:text-slate-900">
              Stores
            </a>
            <a href="#" className="hover:text-slate-900">
              Categories
            </a>
            <a href="#" className="hover:text-slate-900">
              Products
            </a>
            <a href="#" className="hover:text-slate-900">
              Vouchers
            </a>
            <a href="#" className="hover:text-slate-900">
              Invoices
            </a>
            <a href="#" className="hover:text-slate-900">
              Activity Logs
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Cart
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Wishlist
          </button>
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
              aria-label={userEmail ? `Profile for ${userEmail}` : 'Profile'}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-lg font-semibold tracking-widest">
                {initials}
              </span>
            </Link>
          ) : (
            <Link
              to="/signin"
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
