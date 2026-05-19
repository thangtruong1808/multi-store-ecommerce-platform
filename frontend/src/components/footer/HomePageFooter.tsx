import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiRefreshCw } from 'react-icons/fi'
import { useAppSelector } from '../../app/hooks'
import BrandMark from '../BrandMark'
import { departmentBrowsePath } from '../../pages/categoryProducts/categoryProductRoutes'

export type HomePageFooterCategory = {
  id: string
  name: string
  slug: string
}

type HomePageFooterProps = {
  level1Categories: HomePageFooterCategory[]
  isLoading: boolean
  error: string | null
}

const sharedQuickLinks = [
  { to: '/', label: 'Home' },
  { to: '/clearance', label: 'Clearance' },
  { to: '/cart', label: 'Cart' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/contact', label: 'Contact' },
] as const

function footerLinkClassName() {
  return 'inline-block rounded py-1 text-sm text-slate-600 transition hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'
}

const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL ?? '').trim()

export function HomePageFooter({ level1Categories, isLoading, error }: HomePageFooterProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const year = new Date().getFullYear()
  const supportMailto =
    supportEmail && supportEmail.includes('@') ? `mailto:${supportEmail}` : null

  const quickLinks = useMemo(() => {
    const accountLinks = isAuthenticated
      ? [
        { to: '/profile', label: 'Profile' },
        { to: '/orders', label: 'Order history' },
      ]
      : [{ to: '/signin', label: 'Sign in' }]
    return [...sharedQuickLinks, ...accountLinks]
  }, [isAuthenticated])

  return (
    <footer className="border-t border-slate-200 bg-white/95 backdrop-blur" aria-label="Site footer">
      <div className="mx-auto min-w-0 w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
        <div className="mx-auto min-w-0 w-full max-w-7xl py-8 md:py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 space-y-3">
              <BrandMark />
              <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                Shop across departments with one account, cart, and checkout.
              </p>
            </div>

            <nav className="min-w-0" aria-label="Quick links">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Quick links</h2>
              <ul className="mt-3 space-y-1">
                {quickLinks.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link to={item.to} className={footerLinkClassName()}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="min-w-0" aria-label="Shop departments" aria-busy={isLoading}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Shop</h2>
              <div className="mt-3">
                {isLoading ? (
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500" role="status" aria-live="polite">
                    <FiRefreshCw className="h-4 w-4 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
                    <span className="sr-only">Loading departments</span>
                    <span aria-hidden="true">Loading departments…</span>
                  </p>
                ) : null}
                {!isLoading && error ? (
                  <p className="text-sm text-slate-500" role="status">
                    Departments are unavailable right now.
                  </p>
                ) : null}
                {!isLoading && !error && level1Categories.length === 0 ? (
                  <p className="text-sm text-slate-500">No departments yet.</p>
                ) : null}
                {!isLoading && !error && level1Categories.length > 0 ? (
                  <ul className="space-y-1">
                    {level1Categories.map((category) => (
                      <li key={category.id}>
                        <Link to={departmentBrowsePath(category.slug)} className={footerLinkClassName()}>
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </nav>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Support</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Questions about an order or your account? We&apos;re happy to help.
              </p>
              <Link to="/contact" className={`mt-3 ${footerLinkClassName()} font-medium text-sky-700`}>
                Contact us
              </Link>
            </div>
          </div>

          <p className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 sm:text-left">
            {year} Multi-Store Ecommerce Platform — v.1.0 by{' '}
            <a
              href="https://github.com/thangtruong1808"
              className="text-sky-700 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              THANG TRUONG
            </a>
            {supportMailto ? (
              <>
                {' · '}
                <a
                  href={supportMailto}
                  className="text-sky-700 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  Email support
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </footer>
  )
}
