import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { fetchCurrentUser } from './features/auth/authSlice'
import Navbar from './components/Navbar'
import SignInPage from './pages/SignInPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import { CategoryProductsBySlugPage } from './pages/categoryProducts/CategoryProductsBrowsePage'
import { DepartmentBrowsePage } from './pages/categoryProducts/DepartmentBrowsePage'
import { PublicProductDetailPage } from './pages/categoryProducts/PublicProductDetailPage'
import { LegacyShopCategoryRedirect } from './pages/categoryProducts/LegacyShopCategoryRedirect'
import { LegacyShopSlugRedirect } from './pages/categoryProducts/LegacyShopSlugRedirect'
import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards'
import HomePage from './pages/home/HomePage'

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
        <Route path="/shop/categories/level-2/:categoryId/products" element={<LegacyShopCategoryRedirect />} />
        <Route path="/shop/categories/level-3/:categoryId/products" element={<LegacyShopCategoryRedirect />} />
        <Route path="/shop/:categorySlug/products" element={<LegacyShopSlugRedirect />} />
        <Route path="/:level1Slug/browse" element={<DepartmentBrowsePage />} />
        <Route path="/:level1Slug/:categorySlug/products/:productSku" element={<PublicProductDetailPage />} />
        <Route path="/:level1Slug/:categorySlug/products" element={<CategoryProductsBySlugPage />} />
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
