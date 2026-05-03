import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiPackage, FiPlus, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { CategoryParentOption, ManagedStoreOption, ProductDetail, ProductFormState } from './dashboardTypes'
import {
  PRODUCT_FIELD_HINTS,
  countValidationIssues,
  validateProductFormFields,
} from './products/productFormValidation'

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
  managedStores: ManagedStoreOption[]
  isManagedStoresLoading: boolean
  isAdminUser: boolean
  toggleProductStoreId: (storeId: string) => void
  onSelectAllStores: () => void
  onStoreQuantityChange: (storeId: string, value: string) => void
}

function inputBorderClass(hasError: boolean) {
  return hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
    : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
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
  managedStores,
  isManagedStoresLoading,
  isAdminUser,
  toggleProductStoreId,
  onSelectAllStores,
  onStoreQuantityChange,
}: DashboardProductFormModalProps) {
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({})
  const [attemptedSave, setAttemptedSave] = useState(false)

  useEffect(() => {
    setFieldTouched({})
    setAttemptedSave(false)
  }, [editingProduct?.id])

  const validationErrors = useMemo(() => validateProductFormFields(productForm), [productForm])

  const descriptionLines = useMemo(() => {
    return productForm.description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }, [productForm.description])

  const showFieldError = (key: string) =>
    Boolean(validationErrors[key]) && (Boolean(fieldTouched[key]) || attemptedSave)

  const handlePrimarySave = () => {
    const errs = validateProductFormFields(productForm)
    if (countValidationIssues(errs) > 0) {
      setAttemptedSave(true)
      return
    }
    onSaveProduct()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close product form modal overlay"
        onClick={closeProductForm}
        className="fixed inset-0 z-40 bg-slate-900/40"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
        <div
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          aria-busy={isProductSaving}
        >
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                {isProductSaving ? (
                  <DashboardSpinner className="h-4 w-4 border-sky-300 border-t-sky-700" />
                ) : (
                  <FiPackage className="h-4.5 w-4.5" aria-hidden="true" />
                )}
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {editingProduct ? 'Edit product' : 'Create product'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isProductSaving ? 'Submitting to server…' : 'Manage product info, hierarchy category, images and videos.'}
                </p>
                {isProductSaving ? (
                  <span className="sr-only" role="status" aria-live="polite">
                    Submitting product to server
                  </span>
                ) : null}
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

          <div className="mb-4 space-y-2 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stores</p>
                <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.stores}</p>
                <p className="mt-1 text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.storeStock}</p>
              </div>
              {isAdminUser && managedStores.length > 1 ? (
                <button
                  type="button"
                  onClick={onSelectAllStores}
                  className="text-left text-xs font-medium text-sky-700 hover:underline sm:text-right"
                >
                  Select all
                </button>
              ) : null}
            </div>
            {isManagedStoresLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <DashboardSpinner className="h-4 w-4" />
                Loading stores…
              </div>
            ) : managedStores.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                No stores available. Ask an admin to create stores and assign your account to a store.
              </p>
            ) : isAdminUser ? (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/90 p-2">
                {managedStores.map((m) => {
                  const checked = productForm.storeIds.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col gap-2 rounded-md px-1 py-1.5 text-sm transition hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={checked}
                          onChange={() => toggleProductStoreId(m.id)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-slate-800">{m.name}</span>
                          <span className="ml-1 text-xs text-slate-500">{m.slug}</span>
                          {!m.isActive ? <span className="ml-2 text-xs text-amber-800">(inactive)</span> : null}
                        </span>
                      </label>
                      {checked ? (
                        <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                          <label className="sr-only" htmlFor={`product-store-qty-${m.id}`}>
                            Stock quantity for {m.name}
                          </label>
                          <input
                            id={`product-store-qty-${m.id}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={999999}
                            value={productForm.storeQuantities[m.id] ?? '0'}
                            onChange={(e) => onStoreQuantityChange(m.id, e.target.value)}
                            onBlur={() => setFieldTouched((prev) => ({ ...prev, storeStock: true }))}
                            className={`w-full min-w-0 rounded-md border px-2 py-1.5 text-sm tabular-nums text-slate-800 outline-none transition focus:ring sm:w-24 ${inputBorderClass(showFieldError('storeStock'))}`}
                            aria-invalid={showFieldError('storeStock')}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm text-slate-800">
                {managedStores
                  .filter((m) => productForm.storeIds.includes(m.id))
                  .map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 font-medium">
                        {m.name} <span className="text-xs font-normal text-slate-500">({m.slug})</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-slate-500">Qty</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999999}
                          value={productForm.storeQuantities[m.id] ?? '0'}
                          onChange={(e) => onStoreQuantityChange(m.id, e.target.value)}
                          onBlur={() => setFieldTouched((prev) => ({ ...prev, storeStock: true }))}
                          className={`w-full min-w-0 rounded-md border px-2 py-1.5 text-sm tabular-nums text-slate-800 outline-none transition focus:ring sm:w-24 ${inputBorderClass(showFieldError('storeStock'))}`}
                          aria-label={`Stock quantity for ${m.name}`}
                          aria-invalid={showFieldError('storeStock')}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {showFieldError('stores') ? (
              <p className="text-xs text-rose-600" role="alert">
                {validationErrors.stores}
              </p>
            ) : null}
            {showFieldError('storeStock') ? (
              <p className="text-xs text-rose-600" role="alert">
                {validationErrors.storeStock}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="product-form-sku">
                SKU
              </label>
              <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.sku}</p>
              <input
                id="product-form-sku"
                value={productForm.sku}
                onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                onBlur={() => setFieldTouched((prev) => ({ ...prev, sku: true }))}
                aria-invalid={showFieldError('sku')}
                aria-describedby={showFieldError('sku') ? 'product-form-sku-error' : undefined}
                className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring ${inputBorderClass(showFieldError('sku'))}`}
                placeholder="e.g. ACME-WIDGET-01"
              />
              {showFieldError('sku') ? (
                <p id="product-form-sku-error" className="text-xs text-rose-600" role="alert">
                  {validationErrors.sku}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="product-form-name">
                Name
              </label>
              <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.name}</p>
              <input
                id="product-form-name"
                value={productForm.name}
                onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={() => setFieldTouched((prev) => ({ ...prev, name: true }))}
                aria-invalid={showFieldError('name')}
                aria-describedby={showFieldError('name') ? 'product-form-name-error' : undefined}
                className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring ${inputBorderClass(showFieldError('name'))}`}
                placeholder="Product display name"
              />
              {showFieldError('name') ? (
                <p id="product-form-name-error" className="text-xs text-rose-600" role="alert">
                  {validationErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                htmlFor="product-form-description"
              >
                Description
              </label>
              <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.description}</p>
              <textarea
                id="product-form-description"
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                onBlur={() => setFieldTouched((prev) => ({ ...prev, description: true }))}
                rows={12}
                aria-invalid={showFieldError('description')}
                aria-describedby={
                  showFieldError('description')
                    ? 'product-form-description-error'
                    : descriptionLines.length > 0
                      ? 'product-form-description-preview'
                      : undefined
                }
                className={`mt-1.5 min-h-[14rem] w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none transition focus:ring sm:min-h-[16rem] ${inputBorderClass(showFieldError('description'))}`}
                placeholder={'One detail per line, for example:\nOrganic cotton\nMachine wash cold\nImported'}
              />
              {showFieldError('description') ? (
                <p id="product-form-description-error" className="text-xs text-rose-600" role="alert">
                  {validationErrors.description}
                </p>
              ) : null}

              {descriptionLines.length > 0 ? (
                <div
                  id="product-form-description-preview"
                  className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4"
                  aria-live="polite"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer-facing preview</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Each non-empty line below can be shown as its own point where the product is displayed.
                  </p>
                  <ul className="mt-3 list-none space-y-2 text-sm text-slate-800">
                    {descriptionLines.map((line, idx) => (
                      <li key={`desc-line-${idx}`} className="flex gap-2 rounded-md bg-white/80 px-2 py-1.5 shadow-sm ring-1 ring-slate-100">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-800">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                htmlFor="product-form-base-price"
              >
                Base price
              </label>
              <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.basePrice}</p>
              <input
                id="product-form-base-price"
                value={productForm.basePrice}
                onChange={(event) => setProductForm((prev) => ({ ...prev, basePrice: event.target.value }))}
                onBlur={() => setFieldTouched((prev) => ({ ...prev, basePrice: true }))}
                aria-invalid={showFieldError('basePrice')}
                aria-describedby={showFieldError('basePrice') ? 'product-form-base-price-error' : undefined}
                className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring ${inputBorderClass(showFieldError('basePrice'))}`}
                placeholder="0.00"
                inputMode="decimal"
              />
              {showFieldError('basePrice') ? (
                <p id="product-form-base-price-error" className="text-xs text-rose-600" role="alert">
                  {validationErrors.basePrice}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="product-form-status">
                Status
              </label>
              <p className="text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.status}</p>
              <select
                id="product-form-status"
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
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/90 p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Storefront highlights</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={productForm.isClearance}
                    disabled={isProductSaving}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, isClearance: event.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">Clearance</span>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.clearance}</p>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={productForm.isRefurbished}
                    disabled={isProductSaving}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, isRefurbished: event.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">Refurbished</span>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.refurbished}</p>
                  </span>
                </label>
              </div>
            </div>

            <div
              className={`rounded-lg border bg-slate-50 p-3 sm:col-span-2 ${showFieldError('category') ? 'border-rose-300' : 'border-slate-200'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category hierarchy</p>
              <p className="mt-1 text-xs leading-snug text-slate-600">{PRODUCT_FIELD_HINTS.category}</p>
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
                  onBlur={() => setFieldTouched((prev) => ({ ...prev, category: true }))}
                  aria-invalid={showFieldError('category')}
                  className={`rounded-md border px-2 py-2 text-sm text-slate-800 outline-none focus:ring ${inputBorderClass(showFieldError('category'))}`}
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
                  onBlur={() => setFieldTouched((prev) => ({ ...prev, category: true }))}
                  aria-invalid={showFieldError('category')}
                  className={`rounded-md border px-2 py-2 text-sm text-slate-800 outline-none focus:ring ${inputBorderClass(showFieldError('category'))}`}
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
                  onBlur={() => setFieldTouched((prev) => ({ ...prev, category: true }))}
                  aria-invalid={showFieldError('category')}
                  className={`rounded-md border px-2 py-2 text-sm text-slate-800 outline-none focus:ring ${inputBorderClass(showFieldError('category'))}`}
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
              {showFieldError('category') ? (
                <p className="mt-2 text-xs text-rose-600" role="alert">
                  {validationErrors.category}
                </p>
              ) : null}
              {isProductCategoriesLoading && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <DashboardSpinner className="h-3.5 w-3.5" />
                  Loading categories...
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product images (optional, S3 keys)</p>
                  <p className="mt-1 max-w-prose text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.images}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProductForm((prev) => ({ ...prev, imageS3Keys: [...prev.imageS3Keys, ''].slice(0, 4) }))
                  }
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700"
                >
                  <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add image
                </button>
              </div>
              {showFieldError('images') ? (
                <p className="mb-2 text-xs text-rose-600" role="alert">
                  {validationErrors.images}
                </p>
              ) : null}
              <div className="space-y-2">
                {productForm.imageS3Keys.map((value, index) => (
                  <div key={`image-${index}`} className="flex items-center gap-2">
                    <input
                      value={value}
                      onChange={(event) => handleProductImageChange(index, event.target.value)}
                      onBlur={() => setFieldTouched((prev) => ({ ...prev, images: true }))}
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
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product videos (optional, URLs)</p>
                  <p className="mt-1 max-w-prose text-xs leading-snug text-slate-500">{PRODUCT_FIELD_HINTS.videos}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm((prev) => ({ ...prev, videoUrls: [...prev.videoUrls, ''] }))}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700"
                >
                  <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add video
                </button>
              </div>
              <div className="space-y-2">
                {productForm.videoUrls.map((value, index) => {
                  const vk = `video-${index}`
                  const vidErr = showFieldError(vk)
                  return (
                    <div key={`video-${index}`}>
                      <div className="flex items-center gap-2">
                        <input
                          value={value}
                          onChange={(event) => handleProductVideoChange(index, event.target.value)}
                          onBlur={() => setFieldTouched((prev) => ({ ...prev, [vk]: true }))}
                          aria-invalid={vidErr}
                          aria-describedby={vidErr ? `video-err-${index}` : undefined}
                          className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring ${inputBorderClass(vidErr)}`}
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
                      {vidErr ? (
                        <p id={`video-err-${index}`} className="mt-1 text-xs text-rose-600" role="alert">
                          {validationErrors[vk]}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
                {productForm.videoUrls.length === 0 && <p className="text-xs text-slate-500">No videos added.</p>}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {attemptedSave && countValidationIssues(validationErrors) > 0 ? (
              <p className="text-sm text-rose-600 sm:mr-auto" role="status">
                Fix the highlighted fields before saving.
              </p>
            ) : (
              <span className="hidden sm:block" aria-hidden="true" />
            )}
            <div className="flex items-center justify-end gap-2">
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
                onClick={handlePrimarySave}
                disabled={isProductSaving || !hasProductChanges}
                aria-busy={isProductSaving}
                className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProductSaving && <DashboardSpinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                {!isProductSaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                {isProductSaving ? 'Saving…' : editingProduct ? 'Save changes' : 'Create product'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
