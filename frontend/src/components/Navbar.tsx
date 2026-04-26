import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiChevronRight, FiSearch } from 'react-icons/fi'
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
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [isMegaOpen, setIsMegaOpen] = useState(false)
  const [activeLevel1Id, setActiveLevel1Id] = useState<string | null>(null)
  const [activeLevel2Id, setActiveLevel2Id] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [isSearchSubmitting, setIsSearchSubmitting] = useState(false)
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
    `rounded-md px-2 py-1 text-base transition ${
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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur md:relative">
      <div className="relative flex w-full items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center" aria-label="Multi-Store-Ecommerce-Platform Home">
            <BrandMark />
            <span className="sr-only">Multi-Store-Ecommerce-Platform</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-base text-slate-700 md:flex">
          <Link to="/" className={getNavItemClassName(isHomeActive)}>
            Home
          </Link>
          <Link to="/clearance" className={getNavItemClassName(isClearanceActive)}>
            Clearance
          </Link>
          {isCategoriesLoading && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500" aria-busy="true">
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
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
                className={`rounded-md px-2 py-1 text-base transition ${
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
        </nav>

        <div className="flex items-center gap-3" ref={userMenuRef}>
          <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 md:inline-flex">
            <FiSearch className="h-4 w-4 text-slate-500" aria-hidden="true" />
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
              className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              aria-busy={isSearchSubmitting}
            >
              {isSearchSubmitting ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-white" aria-hidden="true" />
              ) : null}
              Search
            </button>
          </div>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Cart
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Wishlist
          </button>
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold tracking-widest text-white hover:bg-sky-700"
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
                      <Link to="/signin" className="block rounded px-2 py-1.5 hover:bg-slate-100">
                        Sign out
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/signin"
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            aria-expanded={isMobileNavOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="text-lg">{isMobileNavOpen ? '×' : '☰'}</span>
          </button>
        </div>
      </div>
      <div className={`${isMobileNavOpen ? 'block' : 'hidden'} border-t border-slate-200 px-4 py-3 md:hidden`}>
        <div className="space-y-2 text-sm">
          <Link to="/" className={`block rounded-md px-2 py-1 ${isHomeActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700'}`}>
            Home
          </Link>
          <Link
            to="/clearance"
            className={`block rounded-md px-2 py-1 ${isClearanceActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700'}`}
          >
            Clearance
          </Link>
          <Link to="/contact" className={`block rounded-md px-2 py-1 ${isContactActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700'}`}>
            Contact
          </Link>
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
            <FiSearch className="h-4 w-4 text-slate-500" aria-hidden="true" />
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
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              aria-busy={isSearchSubmitting}
            >
              {isSearchSubmitting ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-white" aria-hidden="true" />
              ) : null}
              Search
            </button>
          </div>
          {level1Categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onMouseEnter={() => {
                setActiveLevel1Id(category.id)
                setActiveLevel2Id(null)
                setIsMegaOpen(true)
              }}
              className="block text-left text-slate-700"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      {!isCategoriesLoading && level1Categories.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full hidden border-b border-t border-slate-200 bg-white shadow-sm transition md:block ${isMegaOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-rose-600 md:px-6">{categoriesError}</div>
      )}
    </header>
  )
}

export default Navbar
