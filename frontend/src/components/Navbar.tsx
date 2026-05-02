import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import { logoutUser } from '../features/auth/authSlice'
import { NavbarDesktopPrimaryNav } from './navbar/NavbarDesktopPrimaryNav'
import { NavbarDesktopTopRow } from './navbar/NavbarDesktopTopRow'
import { NavbarMegaMenu } from './navbar/NavbarMegaMenu'
import { NavbarMobileBar } from './navbar/NavbarMobileBar'
import { NavbarMobileNavPanel } from './navbar/NavbarMobileNavPanel'
import { NavbarSearchControl } from './navbar/NavbarSearchControl'
import type { PublicCategory } from './navbar/types'

type NavbarProps = {
  isAuthenticated: boolean
  userEmail?: string
  firstName?: string
  lastName?: string
  role?: string
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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur lg:relative">
      <div ref={userMenuRef} className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
        <NavbarMobileBar
          isMobileNavOpen={isMobileNavOpen}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          firstName={firstName}
          lastName={lastName}
          role={role}
          initials={initials}
          isUserMenuOpen={isUserMenuOpen}
          onToggleUserMenu={() => setIsUserMenuOpen((prev) => !prev)}
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
        />

        <div className="hidden w-full flex-col lg:flex">
          <NavbarDesktopTopRow
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={handleSearchSubmit}
            isSearchSubmitting={isSearchSubmitting}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
            firstName={firstName}
            lastName={lastName}
            role={role}
            initials={initials}
            isUserMenuOpen={isUserMenuOpen}
            onToggleUserMenu={() => setIsUserMenuOpen((prev) => !prev)}
            isSigningOut={isSigningOut}
            onSignOut={handleSignOut}
          />
          <NavbarDesktopPrimaryNav
            isCategoriesLoading={isCategoriesLoading}
            level1Categories={level1Categories}
            isHomeActive={isHomeActive}
            isClearanceActive={isClearanceActive}
            isContactActive={isContactActive}
            selectedLevel1CategoryId={selectedLevel1CategoryId}
            pathname={location.pathname}
            onCategoryHover={(categoryId) => {
              setActiveLevel1Id(categoryId)
              setActiveLevel2Id(null)
              setIsMegaOpen(true)
            }}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 lg:hidden md:px-6">
        <div className="mx-auto max-w-7xl">
          <NavbarSearchControl
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSubmit={handleSearchSubmit}
            isSearchSubmitting={isSearchSubmitting}
          />
        </div>
      </div>

      <NavbarMobileNavPanel
        isOpen={isMobileNavOpen}
        isHomeActive={isHomeActive}
        isClearanceActive={isClearanceActive}
        isContactActive={isContactActive}
        isCategoriesLoading={isCategoriesLoading}
        categories={categories}
        level1Categories={level1Categories}
        selectedLevel1CategoryId={selectedLevel1CategoryId}
        pathname={location.pathname}
        mobileExpandedCategoryIds={mobileExpandedCategoryIds}
        onCloseMobileNav={() => setIsMobileNavOpen(false)}
        onToggleMobileCategory={(id) => setMobileExpandedCategoryIds((prev) => ({ ...prev, [id]: !prev[id] }))}
      />

      {!isCategoriesLoading && level1Categories.length > 0 && (
        <NavbarMegaMenu
          categories={categories}
          level2Categories={level2Categories}
          level3Categories={level3Categories}
          activeLevel2Id={activeLevel2Id}
          onMouseEnterPanel={() => setIsMegaOpen(true)}
          onMouseLeavePanel={() => setIsMegaOpen(false)}
          onLevel2Hover={(categoryId) => setActiveLevel2Id(categoryId)}
          isMegaOpen={isMegaOpen}
        />
      )}
      {!isCategoriesLoading && categoriesError && (
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-rose-600 lg:px-6">{categoriesError}</div>
      )}
    </header>
  )
}

export default Navbar
