import type { Dispatch, RefObject, SetStateAction } from 'react'
import { FiAlertTriangle, FiCheck, FiImage, FiTag, FiTrash2, FiUpload, FiX } from 'react-icons/fi'

import { buildProductMediaUrl } from '../../utils/productMediaUrl'
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
  isCategoryImageUploading: boolean
  categoryMediaBaseUrl: string | null
  categoryImageInputRef: RefObject<HTMLInputElement | null>
  onCategoryImageFile: (file: File) => void
  onRemoveCategoryImage: () => void
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
  isCategoryImageUploading,
  categoryMediaBaseUrl,
  categoryImageInputRef,
  onCategoryImageFile,
  onRemoveCategoryImage,
}: DashboardCategoryModalsProps) {
  const categoryPreviewUrl =
    categoryForm.level === '1' && categoryForm.imageS3Key && categoryMediaBaseUrl
      ? buildProductMediaUrl(categoryForm.imageS3Key, categoryMediaBaseUrl)
      : null
  const isCategoryFormBusy = isCategorySaving || isCategoryImageUploading

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
                    onChange={(event) => {
                      const nextLevel = event.target.value as '1' | '2' | '3'
                      setCategoryForm((prev) => ({
                        ...prev,
                        level: nextLevel,
                        parentId: nextLevel === '1' ? 'none' : prev.parentId,
                        imageS3Key: nextLevel === '1' ? prev.imageS3Key : '',
                      }))
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                  </select>
                </label>

                {categoryForm.level === '1' && (
                  <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department photo (optional)</p>
                    <p className="mt-1 text-xs leading-snug text-slate-500">
                      Shown on the home page category carousel. One JPEG, PNG, or WebP (max 8 MB).
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 sm:h-20 sm:w-28">
                        {categoryPreviewUrl ? (
                          <img
                            src={categoryPreviewUrl}
                            alt="Category preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <FiImage className="h-6 w-6" aria-hidden="true" />
                          </div>
                        )}
                        {isCategoryImageUploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                            <DashboardSpinner className="h-5 w-5" />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={categoryImageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void onCategoryImageFile(file)
                            event.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          disabled={isCategoryFormBusy}
                          onClick={() => categoryImageInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiUpload className="h-4 w-4" aria-hidden="true" />
                          {categoryForm.imageS3Key ? 'Replace photo' : 'Upload photo'}
                        </button>
                        {categoryForm.imageS3Key ? (
                          <button
                            type="button"
                            disabled={isCategoryFormBusy}
                            onClick={() => void onRemoveCategoryImage()}
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

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
                  disabled={isCategoryFormBusy || !hasCategoryChanges}
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
