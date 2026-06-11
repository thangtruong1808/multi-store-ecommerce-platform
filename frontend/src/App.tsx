import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { fetchCurrentUser } from './features/auth/authSlice'
import { fetchAndMergeWishlist } from './features/wishlist/wishlistThunks'
import { useSystemHealth } from './hooks/useSystemHealth'
import Navbar from './components/Navbar'
import SignInPage from './pages/SignInPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ConfirmResetPasswordPage from './pages/ConfirmResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import { CategoryProductsBySlugPage } from './pages/categoryProducts/CategoryProductsBrowsePage'
import { DepartmentBrowsePage } from './pages/categoryProducts/DepartmentBrowsePage'
import { PublicProductDetailPage } from './pages/categoryProducts/PublicProductDetailPage'
import { LegacyShopCategoryRedirect } from './pages/categoryProducts/LegacyShopCategoryRedirect'
import { LegacyShopSlugRedirect } from './pages/categoryProducts/LegacyShopSlugRedirect'
import { AdminRoute, GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards'
import HomePage from './pages/home/HomePage'
import ClearancePage from './pages/ClearancePage'
import ContactPage from './pages/ContactPage'
import CartPage from './pages/CartPage'
import WishlistPage from './pages/WishlistPage'
import CheckoutSuccessPage from './pages/CheckoutSuccessPage'
import CheckoutCancelPage from './pages/CheckoutCancelPage'
import OrdersHistoryPage from './pages/OrdersHistoryPage'
import OrderDetailPage from './pages/OrderDetailPage'
import { StorefrontSpinner } from './components/ui/StorefrontSpinner'
import { MaintenancePage, SystemHealthLoadingPage } from './pages/MaintenancePage'

function AppRoutes() {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isHydrated, isLoading: isAuthLoading } = useAppSelector(
    (state) => state.auth,
  )
  const location = useLocation()
  const isDashboardRoute = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchAndMergeWishlist())
    }
  }, [dispatch, isAuthenticated])

  if (!isHydrated && isAuthLoading) {
    return (
      <div
        className="flex min-h-screen min-w-0 flex-col items-center justify-center gap-3 bg-slate-100 px-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <StorefrontSpinner className="h-8 w-8" />
        <p className="text-sm text-slate-600">Loading your session…</p>
        <span className="sr-only">Checking authentication with server</span>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      {!isDashboardRoute && (
        <Navbar
          isAuthenticated={isAuthenticated}
          userEmail={user?.email}
          firstName={user?.firstName}
          lastName={user?.lastName}
          role={user?.role}
          avatarS3Key={user?.avatarS3Key}
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
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password/confirm" element={<ConfirmResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/orders" element={<OrdersHistoryPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

function App() {
  const { status, message, reason, isRetrying, retry } = useSystemHealth()

  if (status === 'checking') {
    return <SystemHealthLoadingPage />
  }

  if (status === 'down') {
    return (
      <MaintenancePage
        reason={reason}
        message={message}
        onRetry={retry}
        isRetrying={isRetrying}
      />
    )
  }

  return <AppRoutes />
}

export default App
