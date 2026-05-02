import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'
import { fetchWithAutoRefresh } from '../fetchDashboardApi'
import type {
  CategoriesResponse,
  CategoryFormState,
  CategoryItem,
  CategoryParentOption,
  DashboardFeatureKey,
} from '../dashboardTypes'

type ListSlice = {
  setCategoriesState: Dispatch<SetStateAction<CategoriesResponse>>
}

export function useDashboardCategoriesForm(
  activeFeature: DashboardFeatureKey,
  list: ListSlice,
  setInlineStatusMessage: Dispatch<SetStateAction<string | null>>,
  setInlineStatusType: Dispatch<SetStateAction<'success' | 'info' | 'error'>>,
) {
  const { setCategoriesState } = list
  const [categoryFormParentOptions, setCategoryFormParentOptions] = useState<CategoryParentOption[]>([])
  const [isCategoryFormParentsLoading, setIsCategoryFormParentsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<CategoryItem | null>(null)
  const [isCategorySaving, setIsCategorySaving] = useState(false)
  const [isCategoryDeleting, setIsCategoryDeleting] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    slug: '',
    level: '1',
    parentId: 'none',
  })

  useEffect(() => {
    if (activeFeature !== 'categories') {
      setIsCategoryFormOpen(false)
      setEditingCategory(null)
      setConfirmDeleteCategory(null)
      setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
    }
  }, [activeFeature])

  useEffect(() => {
    if (!editingCategory) {
      setCategoryForm((prev) => (prev.parentId === 'none' ? prev : { ...prev, parentId: 'none' }))
    }
  }, [editingCategory])

  useEffect(() => {
    if (activeFeature !== 'categories' || !isCategoryFormOpen) return
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
        if (!response.ok) throw new Error('Unable to load parent categories')
        const payload = (await response.json()) as { items?: CategoryParentOption[] }
        if (isMounted) {
          const options = payload.items ?? []
          setCategoryFormParentOptions(options)
          if (categoryForm.parentId !== 'none' && !options.some((item) => item.id === categoryForm.parentId)) {
            setCategoryForm((prev) => ({ ...prev, parentId: 'none' }))
          }
        }
      } finally {
        if (isMounted) setIsCategoryFormParentsLoading(false)
      }
    }
    void loadFormParents()
    return () => {
      isMounted = false
    }
  }, [activeFeature, isCategoryFormOpen, categoryForm.level, categoryForm.parentId])

  const closeCategoryForm = () => {
    setEditingCategory(null)
    setIsCategoryFormOpen(false)
    setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
  }

  const openCreateCategoryForm = () => {
    setEditingCategory(null)
    setIsCategoryFormOpen(true)
    setCategoryForm({ name: '', slug: '', level: '1', parentId: 'none' })
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

  const handleSaveCategory = async () => {
    const hasCategoryChanges =
      editingCategory === null
        ? categoryForm.name.trim().length > 0 && (categoryForm.level === '1' || categoryForm.parentId !== 'none')
        : categoryForm.name.trim() !== editingCategory.name ||
          categoryForm.slug.trim().toLowerCase() !== editingCategory.slug.toLowerCase() ||
          categoryForm.level !== String(editingCategory.level) ||
          (categoryForm.parentId === 'none' ? null : categoryForm.parentId) !== editingCategory.parentId
    if (!hasCategoryChanges) return

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
        },
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

  return {
    categoryFormParentOptions,
    isCategoryFormParentsLoading,
    editingCategory,
    isCategoryFormOpen,
    confirmDeleteCategory,
    setConfirmDeleteCategory,
    isCategorySaving,
    isCategoryDeleting,
    deletingCategoryId,
    categoryForm,
    setCategoryForm,
    closeCategoryForm,
    openCreateCategoryForm,
    openEditCategoryForm,
    handleSaveCategory,
    handleDeleteCategory,
  }
}
