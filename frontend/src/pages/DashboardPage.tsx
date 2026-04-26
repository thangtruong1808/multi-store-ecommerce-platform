import { type ComponentType, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiGrid,
  FiLayers,
  FiList,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTag,
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

type CategoryItem = {
  id: string
  parentId: string | null
  parentName: string | null
  name: string
  slug: string
  level: 1 | 2 | 3
  createdAt: string
}

type CategoriesResponse = {
  items: CategoryItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type CategoryParentOption = {
  id: string
  parentId?: string | null
  name: string
  slug: string
  level: 1 | 2 | 3
}

type ProductItem = {
  id: string
  sku: string
  name: string
  description?: string | null
  basePrice: number
  status: 'active' | 'inactive' | 'draft'
  categoryId: string | null
  categoryName: string | null
  imageCount: number
  videoCount: number
  createdAt: string
  updatedAt: string
}

type ProductDetail = ProductItem & {
  imageS3Keys: string[]
  videoUrls: string[]
}

type ProductsResponse = {
  items: ProductItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type ProductFormState = {
  sku: string
  name: string
  description: string
  basePrice: string
  status: 'active' | 'inactive' | 'draft'
  level1Id: 'none' | string
  level2Id: 'none' | string
  level3Id: 'none' | string
  imageS3Keys: string[]
  videoUrls: string[]
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

const mockData: Record<Exclude<DashboardFeatureKey, 'users' | 'categories' | 'products' | 'activityLogs'>, BasicRow[]> = {
  stores: [
    { id: '1', primary: 'Sydney Flagship', secondary: 'AU-SYD', status: 'Active' },
    { id: '2', primary: 'Melbourne Central', secondary: 'AU-MEL', status: 'Active' },
    { id: '3', primary: 'Brisbane Online Hub', secondary: 'AU-BNE', status: 'Draft' },
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
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-sky-200 border-t-sky-600 ${className}`}
      aria-hidden="true"
    />
  )
}

let refreshInFlight: Promise<boolean> | null = null
let hasPrimedDashboardAccessToken = false
let primeAccessTokenInFlight: Promise<void> | null = null

async function refreshAccessTokenShared(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        return refreshResponse.ok
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}

async function ensureDashboardAccessTokenPrimed(): Promise<void> {
  if (hasPrimedDashboardAccessToken) {
    return
  }

  if (!primeAccessTokenInFlight) {
    primeAccessTokenInFlight = (async () => {
      const refreshed = await refreshAccessTokenShared()
      hasPrimedDashboardAccessToken = refreshed
    })().finally(() => {
      primeAccessTokenInFlight = null
    })
  }

  await primeAccessTokenInFlight
}

async function fetchWithAutoRefresh(input: string, init?: RequestInit): Promise<Response> {
  await ensureDashboardAccessTokenPrimed()

  const response = await fetch(input, init)
  if (response.status !== 401) {
    return response
  }

  const refreshed = await refreshAccessTokenShared()
  if (!refreshed) {
    return response
  }

  return fetch(input, init)
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
  const [categoriesState, setCategoriesState] = useState<CategoriesResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryFilterLevel, setCategoryFilterLevel] = useState<'all' | '1' | '2' | '3'>('all')
  const [categoryFilterParentId, setCategoryFilterParentId] = useState<'all' | string>('all')
  const [categorySearchText, setCategorySearchText] = useState('')
  const [categorySearchInput, setCategorySearchInput] = useState('')
  const [categoryParentOptions, setCategoryParentOptions] = useState<CategoryParentOption[]>([])
  const [isCategoryParentsLoading, setIsCategoryParentsLoading] = useState(false)
  const [categoryFormParentOptions, setCategoryFormParentOptions] = useState<CategoryParentOption[]>([])
  const [isCategoryFormParentsLoading, setIsCategoryFormParentsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<CategoryItem | null>(null)
  const [isCategorySaving, setIsCategorySaving] = useState(false)
  const [isCategoryDeleting, setIsCategoryDeleting] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    level: '1' as '1' | '2' | '3',
    parentId: 'none' as 'none' | string,
  })
  const [productsState, setProductsState] = useState<ProductsResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productFilterStatus, setProductFilterStatus] = useState<'all' | 'active' | 'inactive' | 'draft'>('all')
  const [productFilterCategoryId, setProductFilterCategoryId] = useState<'all' | string>('all')
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchInput, setProductSearchInput] = useState('')
  const [productCategoriesTree, setProductCategoriesTree] = useState<CategoryParentOption[]>([])
  const [isProductCategoriesLoading, setIsProductCategoriesLoading] = useState(false)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductItem | null>(null)
  const [isProductSaving, setIsProductSaving] = useState(false)
  const [isProductDeleting, setIsProductDeleting] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>({
    sku: '',
    name: '',
    description: '',
    basePrice: '',
    status: 'active' as 'active' | 'inactive' | 'draft',
    level1Id: 'none' as 'none' | string,
    level2Id: 'none' as 'none' | string,
    level3Id: 'none' as 'none' | string,
    imageS3Keys: [],
    videoUrls: [],
  })
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
    if (activeFeature !== 'categories') {
      setIsCategoryFormOpen(false)
      setEditingCategory(null)
      setConfirmDeleteCategory(null)
      setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
    }
  }, [activeFeature])

  useEffect(() => {
    if (activeFeature !== 'products') {
      setIsProductFormOpen(false)
      setEditingProduct(null)
      setConfirmDeleteProduct(null)
      setProductForm({
        sku: '',
        name: '',
        description: '',
        basePrice: '',
        status: 'active',
        level1Id: 'none',
        level2Id: 'none',
        level3Id: 'none',
        imageS3Keys: [],
        videoUrls: [],
      })
    }
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
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users?page=${page}&pageSize=${pageSize}`, {
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
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/activity-logs?page=${page}&pageSize=${pageSize}`, {
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

  useEffect(() => {
    if (activeFeature !== 'categories') {
      return
    }

    let isMounted = true
    const loadCategories = async () => {
      setIsCategoriesLoading(true)
      setCategoriesError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (categoryFilterLevel !== 'all') {
          query.set('level', categoryFilterLevel)
        }
        if (categoryFilterParentId !== 'all') {
          query.set('parentId', categoryFilterParentId)
        }
        if (categorySearchText.trim().length > 0) {
          query.set('q', categorySearchText.trim())
        }
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load categories (${response.status})`)
        }

        const payload = (await response.json()) as CategoriesResponse
        if (isMounted) {
          setCategoriesState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          setCategoriesError(error instanceof Error ? error.message : 'Unable to load categories')
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
  }, [activeFeature, page, pageSize, categoryFilterLevel, categoryFilterParentId, categorySearchText])

  useEffect(() => {
    if (activeFeature !== 'categories') {
      return
    }

    if (categoryFilterLevel === 'all' || categoryFilterLevel === '1') {
      setCategoryParentOptions([])
      setCategoryFilterParentId('all')
      return
    }

    let isMounted = true
    const loadParents = async () => {
      setIsCategoryParentsLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/parents?level=${categoryFilterLevel}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Unable to load category parents')
        }
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) {
          setCategoryParentOptions(payload.items ?? [])
          if (
            categoryFilterParentId !== 'all' &&
            !(payload.items ?? []).some((item) => item.id === categoryFilterParentId)
          ) {
            setCategoryFilterParentId('all')
          }
        }
      } finally {
        if (isMounted) {
          setIsCategoryParentsLoading(false)
        }
      }
    }

    void loadParents()
    return () => {
      isMounted = false
    }
  }, [activeFeature, categoryFilterLevel, categoryFilterParentId])

  useEffect(() => {
    if (!editingCategory) {
      setCategoryForm((prev) => (prev.parentId === 'none' ? prev : { ...prev, parentId: 'none' }))
    }
  }, [editingCategory])

  useEffect(() => {
    if (activeFeature !== 'categories' || !isCategoryFormOpen) {
      return
    }

    if (categoryForm.level === '1') {
      setCategoryFormParentOptions([])
      setCategoryForm((prev) => ({ ...prev, parentId: 'none' }))
      return
    }

    let isMounted = true
    const loadFormParents = async () => {
      setIsCategoryFormParentsLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/parents?level=${categoryForm.level}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Unable to load parent categories')
        }
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) {
          const options = payload.items ?? []
          setCategoryFormParentOptions(options)
          if (categoryForm.parentId !== 'none' && !options.some((item) => item.id === categoryForm.parentId)) {
            setCategoryForm((prev) => ({ ...prev, parentId: 'none' }))
          }
        }
      } finally {
        if (isMounted) {
          setIsCategoryFormParentsLoading(false)
        }
      }
    }

    void loadFormParents()
    return () => {
      isMounted = false
    }
  }, [activeFeature, isCategoryFormOpen, categoryForm.level, categoryForm.parentId])

  useEffect(() => {
    if (activeFeature !== 'products') {
      return
    }

    let isMounted = true
    const loadProducts = async () => {
      setIsProductsLoading(true)
      setProductsError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (productFilterStatus !== 'all') {
          query.set('status', productFilterStatus)
        }
        if (productFilterCategoryId !== 'all') {
          query.set('categoryId', productFilterCategoryId)
        }
        if (productSearchText.trim()) {
          query.set('q', productSearchText.trim())
        }
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products?${query.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Unable to load products (${response.status})`)
        }

        const payload = (await response.json()) as ProductsResponse
        if (isMounted) {
          setProductsState({
            items: payload.items ?? [],
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
            totalItems: payload.totalItems ?? 0,
            totalPages: payload.totalPages ?? 1,
          })
        }
      } catch (error) {
        if (isMounted) {
          setProductsError(error instanceof Error ? error.message : 'Unable to load products')
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
  }, [activeFeature, page, pageSize, productFilterStatus, productFilterCategoryId, productSearchText])

  useEffect(() => {
    if (activeFeature !== 'products') {
      return
    }

    let isMounted = true
    const loadCategoryTree = async () => {
      setIsProductCategoriesLoading(true)
      try {
        const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/categories/tree`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Unable to load product categories.')
        }
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) {
          setProductCategoriesTree(payload.items ?? [])
        }
      } catch (error) {
        if (isMounted) {
          setProductsError(error instanceof Error ? error.message : 'Unable to load product categories')
        }
      } finally {
        if (isMounted) {
          setIsProductCategoriesLoading(false)
        }
      }
    }

    void loadCategoryTree()
    return () => {
      isMounted = false
    }
  }, [activeFeature])

  const nonUserRows = useMemo(() => {
    if (activeFeature === 'users' || activeFeature === 'categories' || activeFeature === 'products' || activeFeature === 'activityLogs') {
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
      : activeFeature === 'categories'
        ? categoriesState.totalItems
      : activeFeature === 'products'
        ? productsState.totalItems
      : activeFeature === 'activityLogs'
        ? activityLogsState.totalItems
        : nonUserTotal
  const totalPages =
    activeFeature === 'users'
      ? usersState.totalPages
      : activeFeature === 'categories'
        ? categoriesState.totalPages
      : activeFeature === 'products'
        ? productsState.totalPages
      : activeFeature === 'activityLogs'
        ? activityLogsState.totalPages
        : nonUserTotalPages
  const currentItems =
    activeFeature === 'users'
      ? usersState.items.length
      : activeFeature === 'categories'
        ? categoriesState.items.length
      : activeFeature === 'products'
        ? productsState.items.length
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
  const hasCategoryChanges =
    editingCategory === null
      ? categoryForm.name.trim().length > 0 && (categoryForm.level === '1' || categoryForm.parentId !== 'none')
      : categoryForm.name.trim() !== editingCategory.name ||
        categoryForm.slug.trim().toLowerCase() !== editingCategory.slug.toLowerCase() ||
        categoryForm.level !== String(editingCategory.level) ||
        (categoryForm.parentId === 'none' ? null : categoryForm.parentId) !== editingCategory.parentId
  const level1Options = productCategoriesTree.filter((item) => item.level === 1)
  const level2Options = productCategoriesTree.filter((item) => item.level === 2 && item.parentId === productForm.level1Id)
  const level3Options = productCategoriesTree.filter((item) => item.level === 3 && item.parentId === productForm.level2Id)
  const hasProductChanges =
    editingProduct === null
      ? productForm.sku.trim().length > 0 &&
        productForm.name.trim().length > 0 &&
        productForm.basePrice.trim().length > 0 &&
        productForm.level3Id !== 'none'
      : productForm.sku.trim().toUpperCase() !== editingProduct.sku ||
        productForm.name.trim() !== editingProduct.name ||
        productForm.description.trim() !== (editingProduct.description ?? '') ||
        Number(productForm.basePrice || 0) !== Number(editingProduct.basePrice) ||
        productForm.status !== editingProduct.status ||
        productForm.level3Id !== (editingProduct.categoryId ?? 'none') ||
        productForm.imageS3Keys.filter((item) => item.trim().length > 0).join('|') !== editingProduct.imageS3Keys.join('|') ||
        productForm.videoUrls.filter((item) => item.trim().length > 0).join('|') !== editingProduct.videoUrls.join('|')

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

  const openCreateCategoryForm = () => {
    setEditingCategory(null)
    setIsCategoryFormOpen(true)
    setCategoryForm({
      name: '',
      slug: '',
      level: '1',
      parentId: 'none',
    })
    setInlineStatusMessage(null)
  }

  const openEditCategoryForm = (category: CategoryItem) => {
    setEditingCategory(category)
    setIsCategoryFormOpen(true)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      level: String(category.level) as '1' | '2' | '3',
      parentId: category.parentId ?? 'none',
    })
    setInlineStatusMessage(null)
  }

  const resetProductForm = () => {
    setProductForm({
      sku: '',
      name: '',
      description: '',
      basePrice: '',
      status: 'active',
      level1Id: 'none',
      level2Id: 'none',
      level3Id: 'none',
      imageS3Keys: [],
      videoUrls: [],
    })
  }

  const openCreateProductForm = () => {
    setEditingProduct(null)
    setIsProductFormOpen(true)
    resetProductForm()
    setInlineStatusMessage(null)
  }

  const openEditProductForm = async (product: ProductItem) => {
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/${product.id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Unable to load product detail (${response.status})`)
      }

      const detail = (await response.json()) as ProductDetail
      const level3 = productCategoriesTree.find((item) => item.id === (detail.categoryId ?? ''))
      const level2 = level3 ? productCategoriesTree.find((item) => item.id === (level3.parentId ?? '')) : undefined
      const level1 = level2 ? productCategoriesTree.find((item) => item.id === (level2.parentId ?? '')) : undefined

      setEditingProduct(detail)
      setIsProductFormOpen(true)
      setProductForm({
        sku: detail.sku,
        name: detail.name,
        description: detail.description ?? '',
        basePrice: String(detail.basePrice),
        status: detail.status,
        level1Id: level1?.id ?? 'none',
        level2Id: level2?.id ?? 'none',
        level3Id: level3?.id ?? 'none',
        imageS3Keys: detail.imageS3Keys,
        videoUrls: detail.videoUrls,
      })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Unable to open product edit form.')
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser || !hasEditChanges) {
      return
    }

    setIsEditSaving(true)
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users/${editingUser.id}`, {
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
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users/${user.id}`, {
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

  const handleSaveCategory = async () => {
    if (!hasCategoryChanges) {
      return
    }

    setIsCategorySaving(true)
    setInlineStatusMessage(null)
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        level: Number(categoryForm.level),
        parentId: categoryForm.level === '1' || categoryForm.parentId === 'none' ? null : categoryForm.parentId,
      }
      const response = await fetchWithAutoRefresh(
        editingCategory ? `${API_BASE_URL}/api/categories/${editingCategory.id}` : `${API_BASE_URL}/api/categories`,
        {
          method: editingCategory ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(errorPayload?.message ?? `Unable to save category (${response.status})`)
      }

      const saved = (await response.json()) as CategoryItem
      if (editingCategory) {
        setCategoriesState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)),
        }))
        setInlineStatusType('success')
        setInlineStatusMessage(`Edit successful: ${saved.name} was updated.`)
      } else {
        setCategoriesState((prev) => ({
          ...prev,
          items: [saved, ...prev.items].slice(0, prev.pageSize),
          totalItems: prev.totalItems + 1,
        }))
        setInlineStatusType('success')
        setInlineStatusMessage(`Create successful: ${saved.name} was added.`)
      }

      setEditingCategory(null)
      setIsCategoryFormOpen(false)
      setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to save category.')
    } finally {
      setIsCategorySaving(false)
    }
  }

  const handleDeleteCategory = async (category: CategoryItem) => {
    setIsCategoryDeleting(true)
    setDeletingCategoryId(category.id)
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/categories/${category.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(errorPayload?.message ?? `Unable to delete category (${response.status})`)
      }

      setCategoriesState((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== category.id),
        totalItems: Math.max(0, prev.totalItems - 1),
      }))
      setConfirmDeleteCategory(null)
      if (editingCategory?.id === category.id) {
        setEditingCategory(null)
        setIsCategoryFormOpen(false)
      }
      setInlineStatusType('success')
      setInlineStatusMessage(`Delete successful: ${category.name} was removed.`)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to delete category.')
    } finally {
      setIsCategoryDeleting(false)
      setDeletingCategoryId(null)
    }
  }

  const handleProductImageChange = (index: number, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      imageS3Keys: prev.imageS3Keys.map((item, idx) => (idx === index ? value : item)),
    }))
  }

  const handleProductVideoChange = (index: number, value: string) => {
    setProductForm((prev) => ({
      ...prev,
      videoUrls: prev.videoUrls.map((item, idx) => (idx === index ? value : item)),
    }))
  }

  const handleSaveProduct = async () => {
    if (!hasProductChanges) {
      return
    }

    setIsProductSaving(true)
    setInlineStatusMessage(null)
    try {
      const payload = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        basePrice: Number(productForm.basePrice || 0),
        status: productForm.status,
        categoryId: productForm.level3Id,
        imageS3Keys: productForm.imageS3Keys.map((item) => item.trim()).filter((item) => item.length > 0),
        videoUrls: productForm.videoUrls.map((item) => item.trim()).filter((item) => item.length > 0),
      }
      const response = await fetchWithAutoRefresh(
        editingProduct ? `${API_BASE_URL}/api/products/${editingProduct.id}` : `${API_BASE_URL}/api/products`,
        {
          method: editingProduct ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(errorPayload?.message ?? `Unable to save product (${response.status})`)
      }

      const saved = (await response.json()) as ProductDetail
      const categoryName =
        level3Options.find((item) => item.id === saved.categoryId)?.name ??
        productCategoriesTree.find((item) => item.id === saved.categoryId)?.name ??
        saved.categoryName
      if (editingProduct) {
        setProductsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === saved.id
              ? {
                  ...item,
                  ...saved,
                  categoryName,
                  imageCount: saved.imageS3Keys.length,
                  videoCount: saved.videoUrls.length,
                }
              : item
          ),
        }))
        setInlineStatusType('success')
        setInlineStatusMessage(`Edit successful: ${saved.name} was updated.`)
      } else {
        setProductsState((prev) => ({
          ...prev,
          items: [
            {
              ...saved,
              categoryName,
              imageCount: saved.imageS3Keys.length,
              videoCount: saved.videoUrls.length,
            },
            ...prev.items,
          ].slice(0, prev.pageSize),
          totalItems: prev.totalItems + 1,
        }))
        setInlineStatusType('success')
        setInlineStatusMessage(`Create successful: ${saved.name} was added.`)
      }

      setEditingProduct(null)
      setIsProductFormOpen(false)
      resetProductForm()
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to save product.')
    } finally {
      setIsProductSaving(false)
    }
  }

  const handleDeleteProduct = async (product: ProductItem) => {
    setIsProductDeleting(true)
    setDeletingProductId(product.id)
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(errorPayload?.message ?? `Unable to delete product (${response.status})`)
      }

      setProductsState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === product.id ? { ...item, status: 'inactive' } : item)),
      }))
      setConfirmDeleteProduct(null)
      if (editingProduct?.id === product.id) {
        setEditingProduct(null)
        setIsProductFormOpen(false)
      }
      setInlineStatusType('success')
      setInlineStatusMessage(`Delete successful: ${product.name} is now inactive.`)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to delete product.')
    } finally {
      setIsProductDeleting(false)
      setDeletingProductId(null)
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

          {(usersError || categoriesError || productsError || activityLogsError) && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {usersError ?? categoriesError ?? productsError ?? activityLogsError}
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

          {activeFeature === 'categories' && isCategoryFormOpen && (
            <>
              <button
                type="button"
                aria-label="Close category form modal overlay"
                onClick={() => {
                  setEditingCategory(null)
                  setIsCategoryFormOpen(false)
                  setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
                }}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <FiTag className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-slate-800">{editingCategory ? 'Edit category' : 'Create category'}</h2>
                        <p className="mt-1 text-sm text-slate-500">Manage hierarchy, naming and parent relationships.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null)
                        setIsCategoryFormOpen(false)
                        setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
                      }}
                      className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close category form"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                      Category name
                      <input
                        value={categoryForm.name}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Category name"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Slug (optional)
                      <input
                        value={categoryForm.slug}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="auto-generated if empty"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Level
                      <select
                        value={categoryForm.level}
                        onChange={(event) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            level: event.target.value as '1' | '2' | '3',
                            parentId: event.target.value === '1' ? 'none' : prev.parentId,
                          }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                      >
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                      </select>
                    </label>

                    {categoryForm.level !== '1' && (
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                        Parent category
                        <select
                          value={categoryForm.parentId}
                          onChange={(event) => setCategoryForm((prev) => ({ ...prev, parentId: event.target.value }))}
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        >
                          <option value="none">Select parent</option>
                          {categoryFormParentOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.slug})
                            </option>
                          ))}
                        </select>
                        {isCategoryFormParentsLoading && (
                          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Spinner className="h-3.5 w-3.5" />
                            Loading parents...
                          </span>
                        )}
                      </label>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null)
                        setIsCategoryFormOpen(false)
                        setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveCategory()}
                      disabled={isCategorySaving || !hasCategoryChanges}
                      className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCategorySaving && <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                      {!isCategorySaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                      {isCategorySaving ? 'Saving...' : editingCategory ? 'Save changes' : 'Create category'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeFeature === 'categories' && confirmDeleteCategory && (
            <>
              <button
                type="button"
                aria-label="Close delete category confirmation overlay"
                onClick={() => setConfirmDeleteCategory(null)}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                      <FiAlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Confirm category delete</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        This will permanently remove <span className="font-semibold">{confirmDeleteCategory.name}</span>.
                        Delete can be blocked if children or products are linked.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCategory(null)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCategory(confirmDeleteCategory)}
                      disabled={isCategoryDeleting}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCategoryDeleting && <Spinner className="h-3.5 w-3.5" />}
                      {!isCategoryDeleting && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                      {isCategoryDeleting ? 'Deleting...' : 'Confirm delete'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeFeature === 'products' && isProductFormOpen && (
            <>
              <button
                type="button"
                aria-label="Close product form modal overlay"
                onClick={() => {
                  setIsProductFormOpen(false)
                  setEditingProduct(null)
                  resetProductForm()
                }}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <FiPackage className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-slate-800">{editingProduct ? 'Edit product' : 'Create product'}</h2>
                        <p className="mt-1 text-sm text-slate-500">Manage product info, hierarchy category, images and videos.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProductFormOpen(false)
                        setEditingProduct(null)
                        resetProductForm()
                      }}
                      className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close product form"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                      <input
                        value={productForm.sku}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="SKU code"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                      <input
                        value={productForm.name}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Product name"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                      Description
                      <textarea
                        value={productForm.description}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                        className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="Short description"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Base price
                      <input
                        value={productForm.basePrice}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, basePrice: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                      <select
                        value={productForm.status}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' | 'draft' }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="draft">draft</option>
                      </select>
                    </label>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category hierarchy</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <select
                          value={productForm.level1Id}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              level1Id: event.target.value,
                              level2Id: 'none',
                              level3Id: 'none',
                            }))
                          }
                          className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 outline-none focus:ring focus:ring-sky-100"
                        >
                          <option value="none">Level 1</option>
                          {level1Options.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={productForm.level2Id}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, level2Id: event.target.value, level3Id: 'none' }))}
                          className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 outline-none focus:ring focus:ring-sky-100"
                          disabled={productForm.level1Id === 'none'}
                        >
                          <option value="none">Level 2</option>
                          {level2Options.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={productForm.level3Id}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, level3Id: event.target.value }))}
                          className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 outline-none focus:ring focus:ring-sky-100"
                          disabled={productForm.level2Id === 'none'}
                        >
                          <option value="none">Level 3</option>
                          {level3Options.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {isProductCategoriesLoading && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Spinner className="h-3.5 w-3.5" />
                          Loading categories...
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product images (optional, S3 keys)</p>
                        <button
                          type="button"
                          onClick={() =>
                            setProductForm((prev) => ({ ...prev, imageS3Keys: [...prev.imageS3Keys, ''].slice(0, 4) }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-sky-700"
                        >
                          <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add image
                        </button>
                      </div>
                      <div className="space-y-2">
                        {productForm.imageS3Keys.map((value, index) => (
                          <div key={`image-${index}`} className="flex items-center gap-2">
                            <input
                              value={value}
                              onChange={(event) => handleProductImageChange(index, event.target.value)}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                              placeholder={`Image key #${index + 1}`}
                            />
                            {productForm.imageS3Keys.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setProductForm((prev) => ({
                                    ...prev,
                                    imageS3Keys: prev.imageS3Keys.filter((_, idx) => idx !== index),
                                  }))
                                }
                                className="rounded-md border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
                                aria-label="Remove image row"
                              >
                                <FiX className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                        {productForm.imageS3Keys.length === 0 && (
                          <p className="text-xs text-slate-500">No images added.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product videos (optional, URLs)</p>
                        <button
                          type="button"
                          onClick={() => setProductForm((prev) => ({ ...prev, videoUrls: [...prev.videoUrls, ''] }))}
                          className="inline-flex items-center gap-1 text-xs font-medium text-sky-700"
                        >
                          <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add video
                        </button>
                      </div>
                      <div className="space-y-2">
                        {productForm.videoUrls.map((value, index) => (
                          <div key={`video-${index}`} className="flex items-center gap-2">
                            <input
                              value={value}
                              onChange={(event) => handleProductVideoChange(index, event.target.value)}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                              placeholder={`https://... video URL #${index + 1}`}
                            />
                            {productForm.videoUrls.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setProductForm((prev) => ({
                                    ...prev,
                                    videoUrls: prev.videoUrls.filter((_, idx) => idx !== index),
                                  }))
                                }
                                className="rounded-md border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
                                aria-label="Remove video row"
                              >
                                <FiX className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                        {productForm.videoUrls.length === 0 && (
                          <p className="text-xs text-slate-500">No videos added.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProductFormOpen(false)
                        setEditingProduct(null)
                        resetProductForm()
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveProduct()}
                      disabled={isProductSaving || !hasProductChanges}
                      className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isProductSaving && <Spinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                      {!isProductSaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                      {isProductSaving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeFeature === 'products' && confirmDeleteProduct && (
            <>
              <button
                type="button"
                aria-label="Close delete product confirmation overlay"
                onClick={() => setConfirmDeleteProduct(null)}
                className="fixed inset-0 z-40 bg-slate-900/40"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                      <FiAlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Confirm product deactivation</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        This will set <span className="font-semibold">{confirmDeleteProduct.name}</span> to inactive status.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProduct(null)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProduct(confirmDeleteProduct)}
                      disabled={isProductDeleting}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isProductDeleting && <Spinner className="h-3.5 w-3.5" />}
                      {!isProductDeleting && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                      {isProductDeleting ? 'Deleting...' : 'Confirm delete'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeFeature === 'categories' && (
            <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-medium text-slate-600">
                Level
                <select
                  value={categoryFilterLevel}
                  onChange={(event) => {
                    setCategoryFilterLevel(event.target.value as 'all' | '1' | '2' | '3')
                    setCategoryFilterParentId('all')
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
                >
                  <option value="all">All levels</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Parent
                <select
                  value={categoryFilterParentId}
                  onChange={(event) => setCategoryFilterParentId(event.target.value)}
                  disabled={categoryFilterLevel === 'all' || categoryFilterLevel === '1' || isCategoryParentsLoading}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="all">All parents</option>
                  {categoryParentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Search
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={categorySearchInput}
                    onChange={(event) => setCategorySearchInput(event.target.value)}
                    placeholder="Search by name or slug"
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setCategorySearchText(categorySearchInput)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiSearch className="h-4 w-4" aria-hidden="true" />
                    Apply
                  </button>
                </div>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={openCreateCategoryForm}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  Create
                </button>
              </div>
            </div>
          )}

          {activeFeature === 'products' && (
            <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-medium text-slate-600">
                Status
                <select
                  value={productFilterStatus}
                  onChange={(event) => setProductFilterStatus(event.target.value as 'all' | 'active' | 'inactive' | 'draft')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
                >
                  <option value="all">All status</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="draft">draft</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Category (leaf)
                <select
                  value={productFilterCategoryId}
                  onChange={(event) => setProductFilterCategoryId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
                >
                  <option value="all">All categories</option>
                  {productCategoriesTree
                    .filter((item) => item.level === 3)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Search
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={productSearchInput}
                    onChange={(event) => setProductSearchInput(event.target.value)}
                    placeholder="Search by name or SKU"
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setProductSearchText(productSearchInput)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiSearch className="h-4 w-4" aria-hidden="true" />
                    Apply
                  </button>
                </div>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={openCreateProductForm}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  Create
                </button>
              </div>
            </div>
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
                  ) : activeFeature === 'categories' ? (
                    <>
                      <th className="px-3 py-2.5 font-medium">Name</th>
                      <th className="px-3 py-2.5 font-medium">Slug</th>
                      <th className="px-3 py-2.5 font-medium">Hierarchy</th>
                      <th className="px-3 py-2.5 font-medium">Created</th>
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </>
                  ) : activeFeature === 'products' ? (
                    <>
                      <th className="px-3 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium">Category</th>
                      <th className="px-3 py-2.5 font-medium">Media</th>
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
                (activeFeature === 'categories' && isCategoriesLoading) ||
                (activeFeature === 'products' && isProductsLoading) ||
                (activeFeature === 'activityLogs' && isActivityLogsLoading) ||
                isFeatureLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Spinner />
                        {activeFeature === 'users'
                          ? 'Loading users...'
                          : activeFeature === 'categories'
                            ? 'Loading categories...'
                          : activeFeature === 'products'
                            ? 'Loading products...'
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
                ) : activeFeature === 'categories' ? (
                  categoriesState.items.map((category) => (
                    <tr key={category.id} className="align-middle">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{category.name}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{category.slug}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="space-y-1">
                          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                            Level {category.level}
                          </span>
                          <p className="text-xs text-slate-500">
                            {category.parentName ? `Parent: ${category.parentName}` : 'Root category'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{new Date(category.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditCategoryForm(category)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCategory(category)}
                            disabled={isCategoryDeleting && deletingCategoryId === category.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isCategoryDeleting && deletingCategoryId === category.id ? <Spinner className="h-3 w-3" /> : <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            {isCategoryDeleting && deletingCategoryId === category.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : activeFeature === 'products' ? (
                  productsState.items.map((product) => (
                    <tr key={product.id} className="align-middle">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                        <p className="text-xs text-slate-500">A${Number(product.basePrice).toFixed(2)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{product.categoryName ?? '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="text-xs">{product.imageCount} image(s), {product.videoCount} video(s)</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : product.status === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openEditProductForm(product)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProduct(product)}
                            disabled={isProductDeleting && deletingProductId === product.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isProductDeleting && deletingProductId === product.id ? <Spinner className="h-3 w-3" /> : <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            {isProductDeleting && deletingProductId === product.id ? 'Deleting...' : 'Delete'}
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

                {!isUsersLoading && !isCategoriesLoading && !isProductsLoading && !isActivityLogsLoading && !isFeatureLoading && currentItems === 0 && (
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
