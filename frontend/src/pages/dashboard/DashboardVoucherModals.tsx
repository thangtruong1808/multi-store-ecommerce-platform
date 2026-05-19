import type { Dispatch, SetStateAction } from 'react'
import { FiAlertTriangle, FiCheck, FiGift, FiTrash2, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { ManagedStoreOption, VoucherFormState, VoucherItem } from './dashboardTypes'

type DashboardVoucherModalsProps = {
  isVoucherFormOpen: boolean
  setIsVoucherFormOpen: (open: boolean) => void
  editingVoucher: VoucherItem | null
  voucherForm: VoucherFormState
  setVoucherForm: Dispatch<SetStateAction<VoucherFormState>>
  managedStores: ManagedStoreOption[]
  productPickerItems: { id: string; sku: string; name: string }[]
  isProductPickerLoading: boolean
  productPickerSearch: string
  setProductPickerSearch: (v: string) => void
  hasVoucherChanges: boolean
  isVoucherSaving: boolean
  onSaveVoucher: () => void
  toggleStoreId: (storeId: string) => void
  toggleProductId: (productId: string) => void
  confirmDeleteVoucher: VoucherItem | null
  setConfirmDeleteVoucher: (item: VoucherItem | null) => void
  isVoucherDeleting: boolean
  onDeleteVoucher: () => void
}

export function DashboardVoucherModals({
  isVoucherFormOpen,
  setIsVoucherFormOpen,
  editingVoucher,
  voucherForm,
  setVoucherForm,
  managedStores,
  productPickerItems,
  isProductPickerLoading,
  productPickerSearch,
  setProductPickerSearch,
  hasVoucherChanges,
  isVoucherSaving,
  onSaveVoucher,
  toggleStoreId,
  toggleProductId,
  confirmDeleteVoucher,
  setConfirmDeleteVoucher,
  isVoucherDeleting,
  onDeleteVoucher,
}: DashboardVoucherModalsProps) {
  const closeForm = () => setIsVoucherFormOpen(false)

  return (
    <>
      {isVoucherFormOpen ? (
        <>
          <button
            type="button"
            aria-label="Close voucher form"
            onClick={closeForm}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <FiGift className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">
                      {editingVoucher ? 'Edit voucher' : 'Create voucher'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Set discount, expiry, stores, and optional product restrictions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                  Code
                  <input
                    value={voucherForm.code}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm uppercase"
                    placeholder="WELCOME10"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                  Description
                  <input
                    value={voucherForm.description}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, description: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Discount type
                  <select
                    value={voucherForm.discountType}
                    onChange={(e) =>
                      setVoucherForm((p) => ({
                        ...p,
                        discountType: e.target.value as 'percent' | 'fixed_amount',
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="percent">Percent off</option>
                    <option value="fixed_amount">Fixed amount (AUD)</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Discount value
                  <input
                    type="number"
                    min={0}
                    step={voucherForm.discountType === 'percent' ? 1 : 0.01}
                    value={voucherForm.discountValue}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, discountValue: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Start date (optional)
                  <input
                    type="date"
                    value={voucherForm.startsAt}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, startsAt: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Expiry date
                  <input
                    type="date"
                    required
                    value={voucherForm.expiresAt}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Min order (AUD, optional)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={voucherForm.minOrderAmount}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Max redemptions (optional)
                  <input
                    type="number"
                    min={1}
                    value={voucherForm.maxRedemptions}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, maxRedemptions: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={voucherForm.isActive}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600"
                  />
                  Active
                </label>
              </div>

              <fieldset className="mt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Stores (required)
                </legend>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {managedStores.map((store) => (
                    <label key={store.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={voucherForm.storeIds.includes(store.id)}
                        onChange={() => toggleStoreId(store.id)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                      />
                      {store.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Products (optional — empty = all products at selected stores)
                </legend>
                <input
                  type="search"
                  value={productPickerSearch}
                  onChange={(e) => setProductPickerSearch(e.target.value)}
                  placeholder="Search products…"
                  className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {isProductPickerLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-600" role="status">
                      <DashboardSpinner className="h-4 w-4" />
                      Loading products…
                    </div>
                  ) : productPickerItems.length === 0 ? (
                    <p className="py-2 text-sm text-slate-500">No products found.</p>
                  ) : (
                    productPickerItems.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={voucherForm.productIds.includes(product.id)}
                          onChange={() => toggleProductId(product.id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600"
                        />
                        <span className="min-w-0 truncate">
                          {product.name}{' '}
                          <span className="font-mono text-xs text-slate-500">({product.sku})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>

              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!hasVoucherChanges || isVoucherSaving}
                  onClick={onSaveVoucher}
                  className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {isVoucherSaving ? <DashboardSpinner className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                  {isVoucherSaving ? 'Saving…' : 'Save voucher'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {confirmDeleteVoucher ? (
        <>
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => setConfirmDeleteVoucher(null)}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <FiAlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Deactivate voucher?</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-mono font-medium">{confirmDeleteVoucher.code}</span> will no longer be
                    usable at checkout.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteVoucher(null)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVoucherDeleting}
                  onClick={onDeleteVoucher}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
                >
                  {isVoucherDeleting ? <DashboardSpinner className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
