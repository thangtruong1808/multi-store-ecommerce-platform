import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

import { useAppSelector } from '../../../app/hooks'
import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type {
  ActivityLogsResponse,
  DashboardFeatureKey,
  EditUserFormState,
  ManagedStoreOption,
  StoreItem,
  UserItem,
  UsersResponse,
} from '../dashboardTypes'

export function useDashboardUsersBlock(
  activeFeature: DashboardFeatureKey,
  page: number,
  pageSize: number,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
  dashboardApiReady: boolean,
) {
  const isAdminSession = useAppSelector((state) => state.auth.user?.role === 'admin')

  const [usersState, setUsersState] = useState<UsersResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [activityLogsState, setActivityLogsState] = useState<ActivityLogsResponse>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [isActivityLogsLoading, setIsActivityLogsLoading] = useState(false)
  const [activityLogsError, setActivityLogsError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState<EditUserFormState>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    role: 'customer',
    isActive: true,
    managedStoreIds: [],
  })
  const [baselineManagedStoreIds, setBaselineManagedStoreIds] = useState<string[] | null>(null)
  const [adminStoreOptions, setAdminStoreOptions] = useState<ManagedStoreOption[]>([])
  const [isUserStoreDataLoading, setIsUserStoreDataLoading] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserItem | null>(null)

  useEffect(() => {
    if (activeFeature !== 'users') {
      return
    }

    if (!dashboardApiReady) {
      setIsUsersLoading(true)
      return () => setIsUsersLoading(false)
    }

    let isMounted = true
    const loadUsers = async () => {
      setIsUsersLoading(true)
      setUsersError(null)
      try {
        const response = await fetchWithAutoRefresh(
          `${API_BASE_URL}/api/auth/users?page=${page}&pageSize=${pageSize}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        )
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
  }, [activeFeature, dashboardApiReady, page, pageSize])

  useEffect(() => {
    if (activeFeature !== 'activityLogs') {
      return
    }

    if (!dashboardApiReady) {
      setIsActivityLogsLoading(true)
      return () => setIsActivityLogsLoading(false)
    }

    let isMounted = true
    const loadActivityLogs = async () => {
      setIsActivityLogsLoading(true)
      setActivityLogsError(null)
      try {
        const response = await fetchWithAutoRefresh(
          `${API_BASE_URL}/api/auth/activity-logs?page=${page}&pageSize=${pageSize}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        )
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
  }, [activeFeature, dashboardApiReady, page, pageSize])

  useEffect(() => {
    if (!editingUser || !dashboardApiReady || !isAdminSession) {
      setBaselineManagedStoreIds(null)
      setAdminStoreOptions([])
      return
    }

    let alive = true
    const load = async () => {
      setIsUserStoreDataLoading(true)
      try {
        const [storesRes, idsRes] = await Promise.all([
          fetchWithAutoRefresh(`${API_BASE_URL}/api/stores?page=1&pageSize=100`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users/${editingUser.id}/managed-stores`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
        ])
        if (!storesRes.ok || !idsRes.ok) throw new Error('Unable to load store assignment data.')
        const storesPayload = (await storesRes.json()) as { items?: StoreItem[] }
        const idsPayload = (await idsRes.json()) as { storeIds?: string[] }
        if (!alive) return
        const items = storesPayload.items ?? []
        setAdminStoreOptions(
          items.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            isActive: s.isActive,
          })),
        )
        const ids = (idsPayload.storeIds ?? []).map(String)
        setBaselineManagedStoreIds(ids)
        setEditForm((prev) => ({ ...prev, managedStoreIds: ids }))
      } catch {
        if (alive) {
          setBaselineManagedStoreIds([])
          setAdminStoreOptions([])
        }
      } finally {
        if (alive) setIsUserStoreDataLoading(false)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [editingUser, dashboardApiReady, isAdminSession])

  const toggleUserManagedStore = (storeId: string) => {
    setEditForm((prev) => {
      const next = new Set(prev.managedStoreIds)
      if (next.has(storeId)) next.delete(storeId)
      else next.add(storeId)
      return { ...prev, managedStoreIds: [...next] }
    })
  }

  const openEditForm = (openedUser: UserItem) => {
    setEditingUser(openedUser)
    setEditForm({
      firstName: openedUser.firstName,
      lastName: openedUser.lastName,
      email: openedUser.email,
      mobile: openedUser.mobile ?? '',
      role: openedUser.role,
      isActive: openedUser.isActive,
      managedStoreIds: [],
    })
    setBaselineManagedStoreIds(null)
    setInlineStatusMessage(null)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    const sorted = (a: string[]) => [...a].sort().join(',')
    const storesChanged =
      isAdminSession &&
      baselineManagedStoreIds !== null &&
      sorted(editForm.managedStoreIds) !== sorted(baselineManagedStoreIds)
    const hasChanges =
      editForm.firstName.trim() !== editingUser.firstName ||
      editForm.lastName.trim() !== editingUser.lastName ||
      editForm.email.trim().toLowerCase() !== editingUser.email.toLowerCase() ||
      editForm.mobile.trim() !== (editingUser.mobile ?? '') ||
      editForm.role !== editingUser.role ||
      editForm.isActive !== editingUser.isActive ||
      storesChanged
    if (!hasChanges) return

    setIsEditSaving(true)
    setInlineStatusMessage(null)
    try {
      const body: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        mobile: editForm.mobile,
        role: editForm.role,
        isActive: editForm.isActive,
      }
      if (isAdminSession) {
        body.managedStoreIds = editForm.managedStoreIds
      }

      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const handleSoftDeleteUser = async (deletedUser: UserItem) => {
    setIsDeleteLoading(true)
    setDeletingUserId(deletedUser.id)
    setInlineStatusMessage(null)
    try {
      const response = await fetchWithAutoRefresh(`${API_BASE_URL}/api/auth/users/${deletedUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Unable to delete user (${response.status})`)
      }

      setUsersState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === deletedUser.id ? { ...item, isActive: false } : item)),
      }))
      if (editingUser?.id === deletedUser.id) {
        setEditingUser(null)
      }
      if (confirmDeleteUser?.id === deletedUser.id) {
        setConfirmDeleteUser(null)
      }
      setInlineStatusType('success')
      setInlineStatusMessage(`Delete successful: ${deletedUser.firstName} ${deletedUser.lastName} was deactivated.`)
    } catch (error) {
      setInlineStatusType('error')
      setInlineStatusMessage(error instanceof Error ? error.message : 'Failed to delete user.')
    } finally {
      setIsDeleteLoading(false)
      setDeletingUserId(null)
    }
  }

  return {
    usersState,
    isUsersLoading,
    usersError,
    activityLogsState,
    isActivityLogsLoading,
    activityLogsError,
    editingUser,
    setEditingUser,
    editForm,
    setEditForm,
    baselineManagedStoreIds,
    adminStoreOptions,
    isUserStoreDataLoading,
    isAdminSession,
    toggleUserManagedStore,
    isEditSaving,
    isDeleteLoading,
    deletingUserId,
    confirmDeleteUser,
    setConfirmDeleteUser,
    openEditForm,
    handleSaveUser,
    handleSoftDeleteUser,
  }
}
