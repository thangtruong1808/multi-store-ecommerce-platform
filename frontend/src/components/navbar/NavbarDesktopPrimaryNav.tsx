import { Link } from 'react-router-dom'
import {
  departmentBrowsePath,
  isDepartmentBrowsePath,
  isTieredCategoryProductsPath,
} from '../../pages/categoryProducts/categoryProductRoutes'
import type { PublicCategory } from './types'
import { getNavItemClassName } from './navItemClasses'

type NavbarDesktopPrimaryNavProps = {
  isCategoriesLoading: boolean
  level1Categories: PublicCategory[]
  isHomeActive: boolean
  isClearanceActive: boolean
  isContactActive: boolean
  selectedLevel1CategoryId: string | null
  pathname: string
  onCategoryHover: (categoryId: string) => void
}

export function NavbarDesktopPrimaryNav({
  isCategoriesLoading,
  level1Categories,
  isHomeActive,
  isClearanceActive,
  isContactActive,
  selectedLevel1CategoryId,
  pathname,
  onCategoryHover,
}: NavbarDesktopPrimaryNavProps) {
  return (
    <div className="mx-auto w-full max-w-[min(100%,96rem)] border-t border-slate-100 px-1 pb-3 pt-2.5 xl:max-w-[min(100%,110rem)] 2xl:max-w-[min(100%,118rem)]">
      <nav className="w-full px-1 sm:px-2" aria-label="Primary">
        <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base text-slate-700 sm:gap-x-2.5 md:gap-x-3">
          <Link to="/" className={getNavItemClassName(isHomeActive)}>
            Home
          </Link>
          <Link to="/clearance" className={getNavItemClassName(isClearanceActive)}>
            Clearance
          </Link>
          {isCategoriesLoading && (
            <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-slate-500" aria-busy="true">
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
                aria-hidden="true"
              />
              Loading categories...
            </span>
          )}
          {!isCategoriesLoading &&
            level1Categories.map((category) => (
              <Link
                key={category.id}
                to={departmentBrowsePath(category.slug)}
                onMouseEnter={() => onCategoryHover(category.id)}
                onFocus={() => onCategoryHover(category.id)}
                className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-base transition sm:px-2.5 ${
                  ((pathname === '/' ||
                    pathname.startsWith('/shop/') ||
                    isTieredCategoryProductsPath(pathname) ||
                    isDepartmentBrowsePath(pathname)) &&
                    selectedLevel1CategoryId === category.id)
                    ? 'bg-sky-50 font-semibold text-sky-700'
                    : 'text-slate-700 hover:text-sky-700'
                }`}
              >
                {category.name}
              </Link>
            ))}
          <Link to="/contact" className={getNavItemClassName(isContactActive)}>
            Contact
          </Link>
        </div>
      </nav>
    </div>
  )
}
