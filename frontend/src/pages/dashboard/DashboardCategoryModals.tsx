import type { Dispatch, SetStateAction } from 'react'
import { FiAlertTriangle, FiCheck, FiTag, FiTrash2, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { CategoryFormState, CategoryItem, CategoryParentOption } from './dashboardTypes'

type DashboardCategoryModalsProps = {
  isCategoryFormOpen: boolean
  closeCategoryForm: () => void
  editingCategory: CategoryItem | null
  categoryForm: CategoryFormState
  setCategoryForm: Dispatch<SetStateAction<CategoryFormState>>
  categoryFormParentOptions: CategoryParentOption[]
  isCategoryFormParentsLoading: boolean
  hasCategoryChanges: boolean
  isCategorySaving: boolean
  onSaveCategory: () => void
  confirmDeleteCategory: CategoryItem | null
  setConfirmDeleteCategory: (category: CategoryItem | null) => void
  isCategoryDeleting: boolean
  onDeleteCategory: (category: CategoryItem) => void
}

export function DashboardCategoryModals({
  isCategoryFormOpen,
  closeCategoryForm,
  editingCategory,
  categoryForm,
  setCategoryForm,
  categoryFormParentOptions,
  isCategoryFormParentsLoading,
  hasCategoryChanges,
  isCategorySaving,
  onSaveCategory,
  confirmDeleteCategory,
  setConfirmDeleteCategory,
  isCategoryDeleting,
  onDeleteCategory,
}: DashboardCategoryModalsProps) {
  return (
    <>
      {isCategoryFormOpen && (
        <>
          <button
            type="button"
            aria-label="Close category form modal overlay"
            onClick={closeCategoryForm}
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
                    <h2 className="text-base font-semibold text-slate-800">
                      {editingCategory ? 'Edit category' : 'Create category'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Manage hierarchy, naming and parent relationships.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCategoryForm}
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
                        <DashboardSpinner className="h-3.5 w-3.5" />
                        Loading parents...
                      </span>
                    )}
                  </label>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeCategoryForm}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveCategory}
                  disabled={isCategorySaving || !hasCategoryChanges}
                  className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCategorySaving && <DashboardSpinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                  {!isCategorySaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                  {isCategorySaving ? 'Saving...' : editingCategory ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDeleteCategory && (
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
                    This will permanently remove{' '}
                    <span className="font-semibold">{confirmDeleteCategory.name}</span>. Delete can be blocked if
                    children or products are linked.
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
                  onClick={() => onDeleteCategory(confirmDeleteCategory)}
                  disabled={isCategoryDeleting}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCategoryDeleting && <DashboardSpinner className="h-3.5 w-3.5" />}
                  {!isCategoryDeleting && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                  {isCategoryDeleting ? 'Deleting...' : 'Confirm delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
