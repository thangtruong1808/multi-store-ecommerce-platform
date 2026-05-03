import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import { categoryProductsPath, isTieredCategoryProductsPath } from '../../pages/categoryProducts/categoryProductRoutes'
import type { PublicCategory } from './types'
import { getLevel2ByParent, getLevel3ByParent } from './categoryTree'

const mobileNavRowClass =
  'flex min-h-10 w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition'

const mobileNavLinkClass = (isActive: boolean) =>
  `${mobileNavRowClass} ${isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`

const mobileChevronButtonClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100'

type NavbarMobileNavPanelProps = {
  isOpen: boolean
  isHomeActive: boolean
  isClearanceActive: boolean
  isContactActive: boolean
  isCategoriesLoading: boolean
  categories: PublicCategory[]
  level1Categories: PublicCategory[]
  selectedLevel1CategoryId: string | null
  pathname: string
  mobileExpandedCategoryIds: Record<string, boolean>
  onCloseMobileNav: () => void
  onToggleMobileCategory: (id: string) => void
}

export function NavbarMobileNavPanel({
  isOpen,
  isHomeActive,
  isClearanceActive,
  isContactActive,
  isCategoriesLoading,
  categories,
  level1Categories,
  selectedLevel1CategoryId,
  pathname,
  mobileExpandedCategoryIds,
  onCloseMobileNav,
  onToggleMobileCategory,
}: NavbarMobileNavPanelProps) {
  return (
    <div
      id="mobile-primary-nav"
      className={`${isOpen ? 'block' : 'hidden'} border-t border-slate-200 px-4 py-3 lg:hidden`}
    >
      <nav className="flex flex-col gap-0.5 text-sm" aria-label="Mobile menu">
        <div className={mobileNavLinkClass(isHomeActive)}>
          <Link to="/" className="min-w-0 flex-1 truncate font-[inherit] text-inherit" onClick={onCloseMobileNav}>
            Home
          </Link>
          <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
        </div>
        <div className={mobileNavLinkClass(isClearanceActive)}>
          <Link to="/clearance" className="min-w-0 flex-1 truncate font-[inherit] text-inherit" onClick={onCloseMobileNav}>
            Clearance
          </Link>
          <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
        </div>
        <div className={mobileNavLinkClass(isContactActive)}>
          <Link to="/contact" className="min-w-0 flex-1 truncate font-[inherit] text-inherit" onClick={onCloseMobileNav}>
            Contact
          </Link>
          <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
        </div>
        {isCategoriesLoading ? (
          <div className="flex min-h-10 items-center gap-2 px-2 py-2 text-xs text-slate-500" aria-busy="true">
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
              aria-hidden="true"
            />
            Loading categories...
          </div>
        ) : null}
        {!isCategoriesLoading &&
          level1Categories.map((category) => {
            const l2Children = getLevel2ByParent(categories, category.id)
            const hasL2 = l2Children.length > 0
            const expandedL1 = mobileExpandedCategoryIds[category.id]

            return (
              <div key={category.id} className="flex flex-col">
                <div
                  className={`${mobileNavRowClass} ${
                    ((pathname === '/' ||
                      pathname.startsWith('/shop/') ||
                      isTieredCategoryProductsPath(pathname)) &&
                      selectedLevel1CategoryId === category.id)
                      ? 'bg-sky-50'
                      : ''
                  } text-slate-700`}
                >
                  <Link
                    to={`/?categoryId=${encodeURIComponent(category.id)}`}
                    className={`min-w-0 flex-1 truncate py-0.5 ${
                      ((pathname === '/' ||
                        pathname.startsWith('/shop/') ||
                        isTieredCategoryProductsPath(pathname)) &&
                        selectedLevel1CategoryId === category.id)
                        ? 'font-semibold text-sky-700'
                        : 'text-slate-700 hover:text-sky-700'
                    }`}
                    onClick={onCloseMobileNav}
                  >
                    {category.name}
                  </Link>
                  {hasL2 ? (
                    <button
                      type="button"
                      className={mobileChevronButtonClass}
                      aria-expanded={expandedL1}
                      aria-controls={`mobile-subcats-${category.id}`}
                      aria-label={expandedL1 ? `Hide subcategories under ${category.name}` : `Show subcategories under ${category.name}`}
                      onClick={() => onToggleMobileCategory(category.id)}
                    >
                      <FiChevronRight
                        className={`h-5 w-5 shrink-0 transition-transform ${expandedL1 ? 'rotate-90 text-sky-700' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
                  )}
                </div>
                {hasL2 && expandedL1 ? (
                  <div id={`mobile-subcats-${category.id}`} className="ml-1 border-l border-slate-200 pl-3" role="region">
                    {l2Children.map((l2) => {
                      const l3Children = getLevel3ByParent(categories, l2.id)
                      const hasL3 = l3Children.length > 0
                      const expandedL2 = mobileExpandedCategoryIds[l2.id]

                      return (
                        <div key={l2.id} className="flex flex-col">
                          <div className={`${mobileNavRowClass} pl-1 text-slate-700`}>
                            <Link
                              to={categoryProductsPath(category.slug, l2.slug)}
                              className="min-w-0 flex-1 truncate py-0.5 hover:text-sky-700"
                              onClick={onCloseMobileNav}
                            >
                              {l2.name}
                            </Link>
                            {hasL3 ? (
                              <button
                                type="button"
                                className={mobileChevronButtonClass}
                                aria-expanded={expandedL2}
                                aria-controls={`mobile-subcats-${l2.id}`}
                                aria-label={expandedL2 ? `Hide items under ${l2.name}` : `Show items under ${l2.name}`}
                                onClick={() => onToggleMobileCategory(l2.id)}
                              >
                                <FiChevronRight
                                  className={`h-5 w-5 shrink-0 transition-transform ${expandedL2 ? 'rotate-90 text-sky-700' : ''}`}
                                  aria-hidden="true"
                                />
                              </button>
                            ) : (
                              <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          {hasL3 && expandedL2 ? (
                            <div id={`mobile-subcats-${l2.id}`} className="ml-2 flex flex-col gap-0.5 border-l border-slate-100 py-1 pl-3" role="region">
                              {l3Children.map((l3) => (
                                <Link
                                  key={l3.id}
                                  to={categoryProductsPath(category.slug, l3.slug)}
                                  className="min-h-9 rounded-md px-1 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-sky-700"
                                  onClick={onCloseMobileNav}
                                >
                                  {l3.name}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
      </nav>
    </div>
  )
}
