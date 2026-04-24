import { Link } from 'react-router-dom'

function Navbar({ isAuthenticated, userEmail }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-bold text-slate-900">
            Multi-Store-Ecommerce-Platform
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
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
            >
              {userEmail ?? 'Profile'}
            </Link>
          ) : (
            <Link
              to="/signin"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
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
