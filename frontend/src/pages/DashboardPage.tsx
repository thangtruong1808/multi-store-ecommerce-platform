import { type ComponentType, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiLayers,
  FiList,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logoutUser } from '../features/auth/authSlice'
import BrandMark from '../components/BrandMark'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

type DashboardFeatureKey =
  | 'users'
  | 'stores'
  | 'categories'
  | 'products'
  | 'vouchers'
  | 'invoices'
  | 'activityLogs'

type SidebarItem = {
  key: DashboardFeatureKey
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

type UserItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  mobile?: string | null
  role: 'admin' | 'store_manager' | 'staff' | 'customer'
  isActive: boolean
  createdAt: string
}

type UsersResponse = {
  items: UserItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type ActivityLogItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  action: string
  createdAt: string
}

type ActivityLogsResponse = {
  items: ActivityLogItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type BasicRow = {
  id: string
  primary: string
  secondary: string
  status: string
}

const sideBarItems: SidebarItem[] = [
  { key: 'users', label: 'Users', icon: FiUsers },
  { key: 'stores', label: 'Stores', icon: FiGrid },
  { key: 'categories', label: 'Categories', icon: FiList },
  { key: 'products', label: 'Products', icon: FiPackage },
  { key: 'vouchers', label: 'Vouchers', icon: FiLayers },
  { key: 'invoices', label: 'Invoices', icon: FiSettings },
  { key: 'activityLogs', label: 'Activity Logs', icon: FiRefreshCw },
]

const mockData: Record<Exclude<DashboardFeatureKey, 'users'>, BasicRow[]> = {
  stores: [
    { id: '1', primary: 'Sydney Flagship', secondary: 'AU-SYD', status: 'Active' },
    { id: '2', primary: 'Melbourne Central', secondary: 'AU-MEL', status: 'Active' },
    { id: '3', primary: 'Brisbane Online Hub', secondary: 'AU-BNE', status: 'Draft' },
  ],
  categories: [
    { id: '1', primary: 'Electronics', secondary: 'Level 1', status: 'Active' },
    { id: '2', primary: 'Phones', secondary: 'Level 2', status: 'Active' },
    { id: '3', primary: 'Accessories', secondary: 'Level 3', status: 'Active' },
    { id: '4', primary: 'Office', secondary: 'Level 1', status: 'Active' },
  ],
  products: [
    { id: '1', primary: 'Laptop Pro 14', secondary: 'SKU: LP-14', status: 'Active' },
    { id: '2', primary: 'Wireless Headset X', secondary: 'SKU: WH-X', status: 'Active' },
    { id: '3', primary: 'Ergo Mouse Plus', secondary: 'SKU: EM-PLUS', status: 'Low stock' },
    { id: '4', primary: 'USB-C Dock', secondary: 'SKU: USBC-D', status: 'Active' },
  ],
  vouchers: [
    { id: '1', primary: 'WELCOME10', secondary: '10% Off', status: 'Active' },
    { id: '2', primary: 'FREESHIP', secondary: 'Free Delivery', status: 'Active' },
  ],
  invoices: [
    { id: '1', primary: 'INV-1001', secondary: 'A$1,250.00', status: 'Paid' },
    { id: '2', primary: 'INV-1002', secondary: 'A$430.50', status: 'Pending' },
    { id: '3', primary: 'INV-1003', secondary: 'A$92.00', status: 'Overdue' },
  ],
  activityLogs: [
    { id: '1', primary: 'Role updated', secondary: '2 mins ago', status: 'Success' },
    { id: '2', primary: 'Product edited', secondary: '16 mins ago', status: 'Success' },
    { id: '3', primary: 'Voucher created', secondary: '1 hour ago', status: 'Success' },
    { id: '4', primary: 'User signed in', secondary: '1 hour ago', status: 'Info' },
  ],
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-sky-200 border-t-sky-600 ${className}`}
      aria-hidden="true"
    />
  )
}

function DashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, actionLoading, isLoading, isHydrated, user } = useAppSelector((state) => state.auth)
  const [activeFeature, setActiveFeature] = useState<DashboardFeatureKey>('users')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [usersState, setUsersState] = useState<UsersResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [isFeatureLoading, setIsFeatureLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNavigatingHome, setIsNavigatingHome] = useState(false)
  const [activityLogsState, setActivityLogsState] = useState<ActivityLogsResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isActivityLogsLoading, setIsActivityLogsLoading] = useState(false)
  const [activityLogsError, setActivityLogsError] = useState<string | null>(null)
  const [inlineStatusMessage, setInlineStatusMessage] = useState<string | null>(null)
  const [inlineStatusType, setInlineStatusType] = useState<'success' | 'info' | 'error'>('info')
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    role: 'customer' as UserItem['role'],
    isActive: true,
  })
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserItem | null>(null)
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Unknown user'
  const userRole = user?.role ?? 'unknown'

  useEffect(() => {
    setPage(1)
  }, [activeFeature, pageSize])

  useEffect(() => {
    setIsFeatureLoading(true)
    const timeoutId = window.setTimeout(() => setIsFeatureLoading(false), 180)
    return () => window.clearTimeout(timeoutId)
  }, [activeFeature])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [activeFeature])

  useEffect(() => {
    setInlineStatusMessage(null)
  }, [activeFeature])

  useEffect(() => {
    if (activeFeature !== 'users') {
      return
    }

    let isMounted = true
    const loadUsers = async () => {
      setIsUsersLoading(true)
      setUsersError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/users?page=${page}&pageSize=${pageSize}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load users (${response.status})`)
        }

        const payload = (await response.json()) as UsersResponse
        if (isMounted) {
          setUsersState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          setUsersError(error instanceof Error ? error.message : 'Unable to load users')
        }
      } finally {
        if (isMounted) {
          setIsUsersLoading(false)
        }
      }
    }

    void loadUsers()
    return () => {
      isMounted = false
    }
  }, [activeFeature, page, pageSize])

  useEffect(() => {
    if (activeFeature !== 'activityLogs') {
      return
    }

    let isMounted = true
    const loadActivityLogs = async () => {
      setIsActivityLogsLoading(true)
      setActivityLogsError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/activity-logs?page=${page}&pageSize=${pageSize}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load activity logs (${response.status})`)
        }

        const payload = (await response.json()) as ActivityLogsResponse
        if (isMounted) {
          setActivityLogsState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          setActivityLogsError(error instanceof Error ? error.message : 'Unable to load activity logs')
        }
      } finally {
        if (isMounted) {
          setIsActivityLogsLoading(false)
        }
      }
    }

    void loadActivityLogs()
    return () => {
      isMounted = false
    }
  }, [activeFeature, page, pageSize])

  const nonUserRows = useMemo(() => {
    if (activeFeature === 'users') {
      return []
    }
    return mockData[activeFeature]
  }, [activeFeature])

  const nonUserTotal = nonUserRows.length
  const nonUserTotalPages = Math.max(1, Math.ceil(nonUserTotal / pageSize))
  const nonUserStart = (page - 1) * pageSize
  const nonUserItems = nonUserRows.slice(nonUserStart, nonUserStart + pageSize)

  const totalItems =
    activeFeature === 'users'
      ? usersState.totalItems
      : activeFeature === 'activityLogs'
        ? activityLogsState.totalItems
        : nonUserTotal
  const totalPages =
    activeFeature === 'users'
      ? usersState.totalPages
      : activeFeature === 'activityLogs'
        ? activityLogsState.totalPages
        : nonUserTotalPages
  const currentItems =
    activeFeature === 'users'
      ? usersState.items.length
      : activeFeature === 'activityLogs'
        ? activityLogsState.items.length
        : nonUserItems.length
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min((page - 1) * pageSize + currentItems, totalItems)
  const hasEditChanges =
    editingUser !== null &&
    (editForm.firstName.trim() !== editingUser.firstName ||
      editForm.lastName.trim() !== editingUser.lastName ||
      editForm.email.trim().toLowerCase() !== editingUser.email.toLowerCase() ||
      editForm.mobile.trim() !== (editingUser.mobile ?? '') ||
      editForm.role !== editingUser.role ||
      editForm.isActive !== editingUser.isActive)

  const openEditForm = (user: UserItem) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile ?? '',
      role: user.role,
      isActive: user.isActive,
    })
    setInlineStatusMessage(null)
  }

  const handleSaveUser = async () => {
    if (!editingUser || !hasEditChanges) {
      return
    }

    setIsEditSaving(true)
    setInlineStatusMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          mobile: editForm.mobile,
          role: editForm.role,
          isActive: editForm.isActive,
        }),
      })
      if (!response.ok) {
        throw new Error(`Unable to update user (${response.status})`)
      }

      const updated = (await response.json()) as UserItem
      setUsersState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      }))
      setInlineStatusType('success')
      setInlineStatusMessage(`Edit successful: ${updated.firstName} ${updated.lastName} was updated.`)
      setEditingUser(null)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to update user.')
    } finally {
      setIsEditSaving(false)
    }
  }

  const handleSoftDeleteUser = async (user: UserItem) => {
    setIsDeleteLoading(true)
    setDeletingUserId(user.id)
    setInlineStatusMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Unable to delete user (${response.status})`)
      }

      setUsersState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === user.id ? { ...item, isActive: false } : item)),
      }))
      if (editingUser?.id === user.id) {
        setEditingUser(null)
      }
      if (confirmDeleteUser?.id === user.id) {
        setConfirmDeleteUser(null)
      }
      setInlineStatusType('success')
      setInlineStatusMessage(`Delete successful: ${user.firstName} ${user.lastName} was deactivated.`)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to delete user.')
    } finally {
      setIsDeleteLoading(false)
      setDeletingUserId(null)
    }
  }

  const handleLogout = async () => {
    const result = await dispatch(logoutUser())
    if (logoutUser.fulfilled.match(result)) {
      navigate('/signin', { replace: true })
    }
  }

  const handleBackToFrontend = () => {
    setIsNavigatingHome(true)
    window.setTimeout(() => {
      navigate('/')
    }, 180)
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div
      className={`relative min-h-screen w-full bg-slate-100 lg:grid ${
        isSidebarCollapsed ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'
      }`}
    >
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white p-4 shadow-lg transition-all duration-200 lg:static lg:translate-x-0 lg:shadow-none ${
          isSidebarCollapsed ? 'w-[88px]' : 'w-[280px]'
        } ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 pb-4">
            <div className={`flex items-start ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
              {!isSidebarCollapsed && <BrandMark />}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="hidden rounded-md border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 lg:inline-flex"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <FiChevronRight className="h-4 w-4" aria-hidden="true" /> : <FiChevronLeft className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {!isSidebarCollapsed && <p className="mt-2 text-xs text-slate-500">Admin dashboard</p>}
            {!isSidebarCollapsed && (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Signed in as</p>
                {!isHydrated || isLoading ? (
                  <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                    <Spinner className="h-3.5 w-3.5" />
                    Loading user...
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{fullName}</p>
                    <p className="text-xs text-slate-600">Role: {userRole}</p>
                  </>
                )}
              </div>
            )}
          </div>
          {!isSidebarCollapsed && <h2 className="mb-2 mt-4 px-2 text-sm font-semibold text-slate-700">Dashboard Features</h2>}
          <nav className="space-y-1" aria-label="Dashboard feature navigation">
            {sideBarItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeFeature === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveFeature(key)
                    setIsSidebarOpen(false)
                  }}
                  className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition ${
                    isSidebarCollapsed ? 'justify-center' : 'gap-2'
                  } ${
                    isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title={isSidebarCollapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {!isSidebarCollapsed && label}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleBackToFrontend}
              disabled={isNavigatingHome}
              className={`mb-2 inline-flex w-full items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 ${
                isSidebarCollapsed ? 'justify-center' : 'gap-2'
              }`}
              title={isSidebarCollapsed ? 'Back to Frontend' : undefined}
            >
              {isNavigatingHome ? <Spinner className="h-3.5 w-3.5" /> : <FiArrowLeft className="h-4 w-4" aria-hidden="true" />}
              {!isSidebarCollapsed && (isNavigatingHome ? 'Opening storefront...' : 'Back to Frontend')}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={actionLoading}
              className={`inline-flex w-full items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 ${
                isSidebarCollapsed ? 'justify-center' : 'gap-2'
              }`}
              title={isSidebarCollapsed ? 'Logout' : undefined}
            >
              {actionLoading ? <Spinner className="h-3.5 w-3.5" /> : <FiLogOut className="h-4 w-4" aria-hidden="true" />}
              {!isSidebarCollapsed && (actionLoading ? 'Signing out...' : 'Logout')}
            </button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 p-3 sm:p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              aria-expanded={isSidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              {isSidebarOpen ? <FiX className="h-4 w-4" aria-hidden="true" /> : <FiMenu className="h-4 w-4" aria-hidden="true" />}
              {isSidebarOpen ? 'Close menu' : 'Open menu'}
            </button>
            {isFeatureLoading && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Spinner className="h-3.5 w-3.5" />
                Updating view...
              </div>
            )}
          </div>

          <div className="mb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {sideBarItems.find((item) => item.key === activeFeature)?.label}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage {sideBarItems.find((item) => item.key === activeFeature)?.label?.toLowerCase()} in one place.
              </p>
            </div>
          </div>

          {(usersError || activityLogsError) && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {usersError ?? activityLogsError}
            </p>
          )}

          {inlineStatusMessage && (
            <p
              className={`mb-3 text-xs ${
                inlineStatusType === 'error'
                  ? 'text-red-600'
                  : inlineStatusType === 'success'
                    ? 'text-emerald-600'
                    : 'text-slate-600'
              }`}
            >
              {inlineStatusMessage}
            </p>
          )}

          {activeFeature === 'users' && editingUser && (
            <>
              <button
                type="button"
                aria-label="Close edit user modal overlay"
                onClick={() => setEditingUser(null)}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <FiUsers className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-slate-800">Edit user profile</h2>
                        <p className="mt-1 text-sm text-slate-500">Update identity details, access role and account status.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close edit user form"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      First name
                      <input
                        value={editForm.firstName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="First name"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last name
                      <input
                        value={editForm.lastName}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Last name"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                      Email
                      <input
                        value={editForm.email}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Email"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mobile (optional)
                      <input
                        value={editForm.mobile}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, mobile: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Mobile"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                      <select
                        value={editForm.role}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as UserItem['role'] }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                      >
                        <option value="admin">admin</option>
                        <option value="store_manager">store_manager</option>
                        <option value="staff">staff</option>
                        <option value="customer">customer</option>
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-100"
                      />
                      Active user
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveUser()}
                      disabled={isEditSaving || !hasEditChanges}
                      className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isEditSaving && <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                      {!isEditSaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                      {isEditSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeFeature === 'users' && confirmDeleteUser && (
            <>
              <button
                type="button"
                aria-label="Close delete confirmation overlay"
                onClick={() => setConfirmDeleteUser(null)}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                      <FiAlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Confirm soft delete</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        This will deactivate <span className="font-semibold">{confirmDeleteUser.firstName} {confirmDeleteUser.lastName}</span>.
                        They can no longer sign in unless reactivated.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteUser(null)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSoftDeleteUser(confirmDeleteUser)}
                      disabled={isDeleteLoading}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isDeleteLoading && <Spinner className="h-3.5 w-3.5" />}
                      {!isDeleteLoading && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                      {isDeleteLoading ? 'Deleting...' : 'Confirm delete'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Show <span className="font-semibold text-slate-800">{currentItems}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalItems}</span> items
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Items per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  {activeFeature === 'users' ? (
                    <>
                      <th className="px-3 py-2.5 font-medium">Name</th>
                      <th className="px-3 py-2.5 font-medium">Email</th>
                      <th className="px-3 py-2.5 font-medium">Role</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </>
                  ) : activeFeature === 'activityLogs' ? (
                    <>
                      <th className="px-3 py-2.5 font-medium">Full Name</th>
                      <th className="px-3 py-2.5 font-medium">Email</th>
                      <th className="px-3 py-2.5 font-medium">Action</th>
                      <th className="px-3 py-2.5 font-medium">Date & Time</th>
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5 font-medium">Name</th>
                      <th className="px-3 py-2.5 font-medium">Detail</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(activeFeature === 'users' && isUsersLoading) ||
                (activeFeature === 'activityLogs' && isActivityLogsLoading) ||
                isFeatureLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Spinner />
                        {activeFeature === 'users'
                          ? 'Loading users...'
                          : activeFeature === 'activityLogs'
                            ? 'Loading activity logs...'
                            : 'Loading data...'}
                      </div>
                    </td>
                  </tr>
                ) : activeFeature === 'users' ? (
                  usersState.items.map((user) => (
                    <tr key={user.id} className="align-middle">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">
                          {user.firstName} {user.lastName}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{user.email}</td>
                      <td className="px-3 py-2.5 text-slate-700">{user.role}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(user)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(user)}
                            disabled={isDeleteLoading && deletingUserId === user.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : activeFeature === 'activityLogs' ? (
                  activityLogsState.items.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {log.firstName} {log.lastName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{log.email}</td>
                      <td className="px-3 py-2.5 text-slate-700">{log.action}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">-</td>
                    </tr>
                  ))
                ) : (
                  nonUserItems.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{row.primary}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.secondary}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.status}</td>
                      <td className="px-3 py-2.5 text-slate-500">-</td>
                    </tr>
                  ))
                )}

                {!isUsersLoading && !isActivityLogsLoading && !isFeatureLoading && currentItems === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {Math.min(page, totalPages)} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
      </section>
    </div>
  )
}

export default DashboardPage
