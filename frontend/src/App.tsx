import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { fetchCurrentUser } from './features/auth/authSlice'
import Navbar from './components/Navbar'
import SignInPage from './pages/SignInPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards'

function HomePage() {
  // Redux auth state
  const { user, isAuthenticated, isLoading, isHydrated, error } = useAppSelector((state) => state.auth)
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; basePrice: number; categoryName?: string | null }>>([])
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
  const selectedCategoryId = searchParams.get('categoryId')
  const searchKeyword = searchParams.get('q')?.trim() ?? ''

  useEffect(() => {
    let isMounted = true
    const loadProducts = async () => {
      setIsProductsLoading(true)
      setProductsError(null)
      try {
        const query = new URLSearchParams()
        if (selectedCategoryId) {
          query.set('categoryId', selectedCategoryId)
        }
        if (searchKeyword) {
          query.set('q', searchKeyword)
        }
        const response = await fetch(`${apiBaseUrl}/api/products/public?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load products (${response.status})`)
        }
        const payload = (await response.json()) as {
          items?: Array<{ id: string; name: string; sku: string; basePrice: number; categoryName?: string | null }>
        }
        if (isMounted) {
          setProducts(payload.items ?? [])
        }
      } catch (loadError) {
        if (isMounted) {
          setProducts([])
          setProductsError(loadError instanceof Error ? loadError.message : 'Unable to load products.')
        }
      } finally {
        if (isMounted) {
          setIsProductsLoading(false)
        }
      }
    }

    void loadProducts()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, selectedCategoryId, searchKeyword])

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">Multi-Store-Ecommerce-Platform</h1>
      <p className="mt-3 text-base text-slate-600">
        React 18 + Vite + TailwindCSS + Redux auth state are ready with C#
        backend.
      </p>
      <p className="mt-3 rounded bg-slate-100 p-3 text-sm">
        {isLoading && 'Checking login session...'}
        {!isLoading && !isHydrated && 'Preparing auth state...'}
        {!isLoading &&
          isHydrated &&
          isAuthenticated &&
          `Authenticated as ${user?.email ?? 'user'}.`}
        {!isLoading &&
          isHydrated &&
          !isAuthenticated &&
          'Not authenticated (normal for first visit).'}
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {productsError && <p className="mt-2 text-sm text-red-600">{productsError}</p>}
      <p className="mt-1 text-sm text-slate-500">
        Set{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">
          VITE_API_BASE_URL
        </code>{' '}
        in{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">
          frontend/.env
        </code>{' '}
        to connect to the backend.
      </p>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {selectedCategoryId
            ? searchKeyword
              ? `Products for selected category matching "${searchKeyword}"`
              : 'Products for selected category'
            : searchKeyword
              ? `All active products matching "${searchKeyword}"`
              : 'All active products'}
        </h2>
        {isProductsLoading ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500" aria-busy="true">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
              aria-hidden="true"
            />
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No products found for this category.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {products.map((product) => (
              <div key={product.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-500">
                  SKU: {product.sku} • A${Number(product.basePrice).toFixed(2)}
                  {product.categoryName ? ` • ${product.categoryName}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClearancePage() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">Clearance</h1>
      <p className="mt-3 text-base text-slate-600">Welcome to the Clearance page.</p>
    </div>
  )
}

function ContactPage() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="mt-3 text-base text-slate-600">Welcome to the Contact page.</p>
    </div>
  )
}

function App() {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)
  const location = useLocation()
  const isDashboardRoute = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      {!isDashboardRoute && (
        <Navbar
          isAuthenticated={isAuthenticated}
          userEmail={user?.email}
          firstName={user?.firstName}
          lastName={user?.lastName}
          role={user?.role}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/clearance" element={<ClearancePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default App
