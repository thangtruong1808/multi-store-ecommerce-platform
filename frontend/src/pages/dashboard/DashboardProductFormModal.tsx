import type { Dispatch, SetStateAction } from 'react'
import { FiCheck, FiPackage, FiPlus, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { CategoryParentOption, ProductDetail, ProductFormState } from './dashboardTypes'

type DashboardProductFormModalProps = {
  closeProductForm: () => void
  editingProduct: ProductDetail | null
  productForm: ProductFormState
  setProductForm: Dispatch<SetStateAction<ProductFormState>>
  level1Options: CategoryParentOption[]
  level2Options: CategoryParentOption[]
  level3Options: CategoryParentOption[]
  isProductCategoriesLoading: boolean
  handleProductImageChange: (index: number, value: string) => void
  handleProductVideoChange: (index: number, value: string) => void
  hasProductChanges: boolean
  isProductSaving: boolean
  onSaveProduct: () => void
}

export function DashboardProductFormModal({
  closeProductForm,
  editingProduct,
  productForm,
  setProductForm,
  level1Options,
  level2Options,
  level3Options,
  isProductCategoriesLoading,
  handleProductImageChange,
  handleProductVideoChange,
  hasProductChanges,
  isProductSaving,
  onSaveProduct,
}: DashboardProductFormModalProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close product form modal overlay"
        onClick={closeProductForm}
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
                <h2 className="text-base font-semibold text-slate-800">
                  {editingProduct ? 'Edit product' : 'Create product'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Manage product info, hierarchy category, images and videos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeProductForm}
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
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    status: event.target.value as 'active' | 'inactive' | 'draft',
                  }))
                }
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
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, level2Id: event.target.value, level3Id: 'none' }))
                  }
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
                  <DashboardSpinner className="h-3.5 w-3.5" />
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
                {productForm.imageS3Keys.length === 0 && <p className="text-xs text-slate-500">No images added.</p>}
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
                {productForm.videoUrls.length === 0 && <p className="text-xs text-slate-500">No videos added.</p>}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeProductForm}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <FiX className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveProduct}
              disabled={isProductSaving || !hasProductChanges}
              className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProductSaving && <DashboardSpinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
              {!isProductSaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
              {isProductSaving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
