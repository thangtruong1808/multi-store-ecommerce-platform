import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiChevronRight, FiHeart, FiSearch, FiShoppingCart } from 'react-icons/fi'
import { useAppDispatch } from '../app/hooks'
import { logoutUser } from '../features/auth/authSlice'
import BrandMark from './BrandMark'

type NavbarProps = {
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
  role?: string
}

type PublicCategory = {
  id: string
  parentId: string | null
  name: string
  slug: string
  level: number
}

function Navbar({ isAuthenticated, userEmail, firstName, lastName, role }: NavbarProps) {
  const dispatch = useAppDispatch()
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [isMegaOpen, setIsMegaOpen] = useState(false)
  const [activeLevel1Id, setActiveLevel1Id] = useState<string | null>(null)
  const [activeLevel2Id, setActiveLevel2Id] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [mobileExpandedCategoryIds, setMobileExpandedCategoryIds] = useState<Record<string, boolean>>({})
  const [searchInput, setSearchInput] = useState('')
  const [isSearchSubmitting, setIsSearchSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
  const selectedCategoryId = searchParams.get('categoryId')
  const level1Categories = categories.filter((category) => category.level === 1)
  const level2Categories = categories.filter((category) => category.level === 2 && category.parentId === activeLevel1Id)
  const level3Categories = categories.filter((category) => category.level === 3 && category.parentId === activeLevel2Id)
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  let selectedLevel1CategoryId: string | null = null
  if (selectedCategoryId && categoriesById.has(selectedCategoryId)) {
    let cursor: PublicCategory | undefined = categoriesById.get(selectedCategoryId)
    while (cursor) {
      if (cursor.level === 1) {
        selectedLevel1CategoryId = cursor.id
        break
      }
      cursor = cursor.parentId ? categoriesById.get(cursor.parentId) : undefined
    }
  }

  const isHomeActive = location.pathname === '/' && !selectedCategoryId
  const isClearanceActive = location.pathname === '/clearance'
  const isContactActive = location.pathname === '/contact'

  const getNavItemClassName = (isActive: boolean) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-base transition sm:px-2.5 ${
      isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:text-sky-700'
    }`

  useEffect(() => {
    let isMounted = true
    const loadCategories = async () => {
      setIsCategoriesLoading(true)
      setCategoriesError(null)
      try {
        let response = await fetch(`${apiBaseUrl}/api/categories/public`)
        if (!response.ok) {
          response = await fetch('/api/categories/public')
        }
        if (!response.ok) throw new Error('Unable to load categories.')

        const payload = (await response.json()) as { items?: PublicCategory[] }
        if (isMounted) {
          setCategories(payload.items ?? [])
          const firstLevel1 = (payload.items ?? []).find((category) => category.level === 1)
          setActiveLevel1Id(firstLevel1?.id ?? null)
          setActiveLevel2Id(null)
        }
      } catch {
        if (isMounted) {
          setCategories([])
          setActiveLevel1Id(null)
          setActiveLevel2Id(null)
          setCategoriesError('Failed to fetch categories name on navbar.')
        }
      } finally {
        if (isMounted) {
          setIsCategoriesLoading(false)
        }
      }
    }

    void loadCategories()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl])

  useEffect(() => {
    if (!activeLevel1Id && level1Categories.length > 0) {
      setActiveLevel1Id(level1Categories[0].id)
    }
  }, [activeLevel1Id, level1Categories])

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) {
        return
      }
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
    }
  }, [])

  useEffect(() => {
    setActiveLevel2Id(null)
  }, [activeLevel1Id])

  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    setIsSearchSubmitting(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleBreakpointChange = () => {
      if (mediaQuery.matches) {
        setIsMobileNavOpen(false)
      }
    }
    mediaQuery.addEventListener('change', handleBreakpointChange)
    return () => {
      mediaQuery.removeEventListener('change', handleBreakpointChange)
    }
  }, [])

  useEffect(() => {
    if (!isMobileNavOpen) {
      setMobileExpandedCategoryIds({})
    }
  }, [isMobileNavOpen])

  const level2ByParent = (parentId: string) =>
    categories.filter((category) => category.level === 2 && category.parentId === parentId)

  const level3ByParent = (parentId: string) =>
    categories.filter((category) => category.level === 3 && category.parentId === parentId)

  const hasLevel2Children = (level1Id: string) => level2ByParent(level1Id).length > 0

  const hasLevel3Children = (level2Id: string) => level3ByParent(level2Id).length > 0

  const toggleMobileCategory = (id: string) => {
    setMobileExpandedCategoryIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const mobileNavRowClass =
    'flex min-h-10 w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition'

  const mobileNavLinkClass = (isActive: boolean) =>
    `${mobileNavRowClass} ${isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`

  const mobileChevronButtonClass =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100'

  const handleSearchSubmit = () => {
    setIsSearchSubmitting(true)
    const query = new URLSearchParams(location.search)
    const keyword = searchInput.trim()
    if (keyword) {
      query.set('q', keyword)
    } else {
      query.delete('q')
    }
    query.delete('categoryId')
    navigate(`/?${query.toString()}`)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const result = await dispatch(logoutUser())
    setIsSigningOut(false)
    if (logoutUser.fulfilled.match(result)) {
      setIsUserMenuOpen(false)
      navigate('/signin', { replace: true })
    }
  }

  const searchFieldClassName =
    'min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'

  const searchControl = (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <FiSearch className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleSearchSubmit()
          }
        }}
        placeholder="Enter product name"
        className={searchFieldClassName}
        aria-label="Search products"
      />
      <button
        type="button"
        onClick={handleSearchSubmit}
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
        aria-busy={isSearchSubmitting}
      >
        {isSearchSubmitting ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-white" aria-hidden="true" />
        ) : null}
        Search
      </button>
    </div>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur lg:relative">
      {/* Mobile: logo | actions. lg+: row 1 = logo + tools (centered); row 2 = primary links (centered). */}
      <div ref={userMenuRef} className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
        {/* Below lg: logo + compact actions (primary links live in mobile drawer + search strip) */}
        <div className="flex items-center justify-between gap-x-3 gap-y-2 py-3 lg:hidden">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center"
            aria-label="Multi-Store-Ecommerce-Platform Home"
          >
            <BrandMark />
            <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
          </Link>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <button type="button" className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 px-2 text-slate-700 hover:bg-slate-50" aria-label="Shopping cart">
              <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            <button type="button" className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 px-2 text-slate-700 hover:bg-slate-50" aria-label="Wishlist">
              <FiHeart className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            {isAuthenticated ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold tracking-widest text-white hover:bg-sky-700"
                  aria-expanded={isUserMenuOpen}
                  aria-label={userEmail ? `Open menu for ${userEmail}` : 'Open user menu'}
                >
                  {initials}
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm">
                      <p className="font-medium text-slate-800">{[firstName, lastName].filter(Boolean).join(' ') || 'User'}</p>
                      <p className="truncate text-slate-500">{userEmail ?? 'No email'}</p>
                      <p className="mt-1 text-xs text-slate-500">Role: {role ?? 'unknown'}</p>
                    </div>
                    <ul className="p-2 text-sm text-slate-600">
                      <li>
                        <Link to="/dashboard" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                          Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link to="/profile" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                          Profile
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
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
            ) : (
              <Link to="/signin" className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs text-white hover:bg-sky-700 sm:px-3 sm:text-sm">
                Sign In
              </Link>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-primary-nav"
              aria-label="Toggle navigation menu"
            >
              <span className="text-lg">{isMobileNavOpen ? '×' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* lg+: single grid row; search column shrinks with min-w-0; not edge-to-edge (parent max-w 120rem) */}
        <div className="hidden w-full flex-col lg:flex">
          <div className="mx-auto w-full max-w-7xl pt-3">
            <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 lg:gap-x-3 xl:gap-x-4">
            <Link
              to="/"
              className="flex shrink-0 items-center justify-self-start"
              aria-label="Multi-Store-Ecommerce-Platform Home"
            >
              <BrandMark />
              <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
            </Link>

            <div className="inline-flex min-h-9 min-w-0 w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 lg:min-h-8 lg:gap-1 lg:px-1.5 lg:py-1 xl:min-h-9 xl:gap-1.5 xl:px-2 xl:py-1">
              <FiSearch className="h-3.5 w-3.5 shrink-0 text-slate-500 lg:h-3.5 lg:w-3.5 xl:h-4 xl:w-4" aria-hidden="true" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchSubmit()
                  }
                }}
                placeholder="Enter product name"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 xl:text-sm"
                aria-label="Search products"
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
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
              <button type="button" className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" aria-label="Shopping cart">
                Cart
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" aria-label="Wishlist">
                Wishlist
              </button>
              {isAuthenticated ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold tracking-widest text-white hover:bg-sky-700"
                    aria-expanded={isUserMenuOpen}
                    aria-label={userEmail ? `Open menu for ${userEmail}` : 'Open user menu'}
                  >
                    {initials}
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-200 px-4 py-3 text-sm">
                        <p className="font-medium text-slate-800">{[firstName, lastName].filter(Boolean).join(' ') || 'User'}</p>
                        <p className="truncate text-slate-500">{userEmail ?? 'No email'}</p>
                        <p className="mt-1 text-xs text-slate-500">Role: {role ?? 'unknown'}</p>
                      </div>
                      <ul className="p-2 text-sm text-slate-600">
                        <li>
                          <Link to="/dashboard" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                            Dashboard
                          </Link>
                        </li>
                        <li>
                          <Link to="/profile" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                            Profile
                          </Link>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => void handleSignOut()}
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
              ) : (
                <Link to="/signin" className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">
                  Sign In
                </Link>
              )}
            </div>
            </div>
          </div>

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
                    <button
                      key={category.id}
                      type="button"
                      onMouseEnter={() => {
                        setActiveLevel1Id(category.id)
                        setActiveLevel2Id(null)
                        setIsMegaOpen(true)
                      }}
                      className={`shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-base transition sm:px-2.5 ${
                        location.pathname === '/' && selectedLevel1CategoryId === category.id
                          ? 'bg-sky-50 font-semibold text-sky-700'
                          : 'text-slate-700 hover:text-sky-700'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                <Link to="/contact" className={getNavItemClassName(isContactActive)}>
                  Contact
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Below lg: search stacked with the collapsible link group (same navigation region as large screens, reorganized) */}
      <div className="border-t border-slate-100 px-4 py-2.5 lg:hidden md:px-6">
        <div className="mx-auto max-w-7xl">{searchControl}</div>
      </div>

      <div
        id="mobile-primary-nav"
        className={`${isMobileNavOpen ? 'block' : 'hidden'} border-t border-slate-200 px-4 py-3 lg:hidden`}
      >
        <nav className="flex flex-col gap-0.5 text-sm" aria-label="Mobile menu">
          <div className={mobileNavLinkClass(isHomeActive)}>
            <Link to="/" className="min-w-0 flex-1 truncate font-[inherit] text-inherit" onClick={() => setIsMobileNavOpen(false)}>
              Home
            </Link>
            <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
          </div>
          <div className={mobileNavLinkClass(isClearanceActive)}>
            <Link
              to="/clearance"
              className="min-w-0 flex-1 truncate font-[inherit] text-inherit"
              onClick={() => setIsMobileNavOpen(false)}
            >
              Clearance
            </Link>
            <span className="inline-flex h-9 w-9 shrink-0" aria-hidden="true" />
          </div>
          <div className={mobileNavLinkClass(isContactActive)}>
            <Link to="/contact" className="min-w-0 flex-1 truncate font-[inherit] text-inherit" onClick={() => setIsMobileNavOpen(false)}>
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
              const l2Children = level2ByParent(category.id)
              const hasL2 = l2Children.length > 0
              const expandedL1 = mobileExpandedCategoryIds[category.id]

              return (
                <div key={category.id} className="flex flex-col">
                  <div
                    className={`${mobileNavRowClass} ${location.pathname === '/' && selectedLevel1CategoryId === category.id ? 'bg-sky-50' : ''} text-slate-700`}
                  >
                    <Link
                      to={`/?categoryId=${encodeURIComponent(category.id)}`}
                      className={`min-w-0 flex-1 truncate py-0.5 ${location.pathname === '/' && selectedLevel1CategoryId === category.id ? 'font-semibold text-sky-700' : 'text-slate-700 hover:text-sky-700'}`}
                      onClick={() => setIsMobileNavOpen(false)}
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
                        onClick={() => toggleMobileCategory(category.id)}
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
                        const l3Children = level3ByParent(l2.id)
                        const hasL3 = l3Children.length > 0
                        const expandedL2 = mobileExpandedCategoryIds[l2.id]

                        return (
                          <div key={l2.id} className="flex flex-col">
                            <div className={`${mobileNavRowClass} pl-1 text-slate-700`}>
                              <Link
                                to={`/?categoryId=${encodeURIComponent(l2.id)}`}
                                className="min-w-0 flex-1 truncate py-0.5 hover:text-sky-700"
                                onClick={() => setIsMobileNavOpen(false)}
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
                                  onClick={() => toggleMobileCategory(l2.id)}
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
                                    to={`/?categoryId=${encodeURIComponent(l3.id)}`}
                                    className="min-h-9 rounded-md px-1 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-sky-700"
                                    onClick={() => setIsMobileNavOpen(false)}
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
      {!isCategoriesLoading && level1Categories.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full hidden border-b border-t border-slate-200 bg-white shadow-sm transition lg:block ${isMegaOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onMouseEnter={() => setIsMegaOpen(true)}
          onMouseLeave={() => setIsMegaOpen(false)}
        >
          <div className="w-full px-4 py-5 md:px-6 lg:px-8">
            <div className="grid w-full grid-cols-4 gap-6">
              <div>
                <div className="space-y-1">
                  {level2Categories.length > 0 ? (
                    level2Categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/?categoryId=${encodeURIComponent(category.id)}`}
                        onMouseEnter={() => setActiveLevel2Id(category.id)}
                        className={`inline-flex items-center gap-1.5 px-1 py-1 text-sm text-slate-700 transition hover:text-sky-700 ${
                activeLevel2Id === category.id ? 'font-semibold' : ''
              }`}
                      >
              <span>{category.name}</span>
              {categories.some((item) => item.level === 3 && item.parentId === category.id) ? (
                <FiChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
                      </Link>
                    ))
                  ) : null}
                </div>
              </div>
              <div className="col-span-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {level3Categories.length > 0 ? (
                    level3Categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/?categoryId=${encodeURIComponent(category.id)}`}
                      className="px-1 py-1 text-sm text-slate-700 transition hover:text-sky-700"
                      >
                        {category.name}
                      </Link>
                    ))
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isCategoriesLoading && categoriesError && (
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-rose-600 lg:px-6">{categoriesError}</div>
      )}
    </header>
  )
}

export default Navbar
