import type { Dispatch, SetStateAction } from 'react'
import { FiAlertTriangle, FiCheck, FiShoppingBag, FiTrash2, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { StoreFormState, StoreItem } from './dashboardTypes'

type DashboardStoreModalsProps = {
  isStoreFormOpen: boolean
  closeStoreForm: () => void
  editingStore: StoreItem | null
  storeForm: StoreFormState
  setStoreForm: Dispatch<SetStateAction<StoreFormState>>
  hasStoreChanges: boolean
  isStoreSaving: boolean
  onSaveStore: () => void
  confirmDeleteStore: StoreItem | null
  setConfirmDeleteStore: (store: StoreItem | null) => void
  isStoreDeleting: boolean
  onDeleteStore: (store: StoreItem) => void
}

export function DashboardStoreModals({
  isStoreFormOpen,
  closeStoreForm,
  editingStore,
  storeForm,
  setStoreForm,
  hasStoreChanges,
  isStoreSaving,
  onSaveStore,
  confirmDeleteStore,
  setConfirmDeleteStore,
  isStoreDeleting,
  onDeleteStore,
}: DashboardStoreModalsProps) {
  return (
    <>
      {isStoreFormOpen && (
        <>
          <button
            type="button"
            aria-label="Close store form modal overlay"
            onClick={closeStoreForm}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <FiShoppingBag className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">
                      {editingStore ? 'Edit store' : 'Create store'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Name, slug, contact and regional defaults.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeStoreForm}
                  className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close store form"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Store name
                  <input
                    value={storeForm.name}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="Store name"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Slug (optional)
                  <input
                    value={storeForm.slug}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, slug: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="auto-generated if empty"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active
                  <select
                    value={storeForm.isActive ? 'yes' : 'no'}
                    onChange={(event) =>
                      setStoreForm((prev) => ({ ...prev, isActive: event.target.value === 'yes' }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  >
                    <option value="yes">Active</option>
                    <option value="no">Inactive</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Email
                  <input
                    type="email"
                    value={storeForm.email}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="contact@store.example"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                  <input
                    value={storeForm.phone}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Currency (ISO)
                  <input
                    value={storeForm.defaultCurrencyCode}
                    onChange={(event) =>
                      setStoreForm((prev) => ({ ...prev, defaultCurrencyCode: event.target.value.toUpperCase() }))
                    }
                    maxLength={3}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="AUD"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Timezone
                  <input
                    value={storeForm.timezone}
                    onChange={(event) => setStoreForm((prev) => ({ ...prev, timezone: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="Australia/Sydney"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeStoreForm}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 sm:min-h-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveStore}
                  disabled={!hasStoreChanges || isStoreSaving}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-0"
                >
                  {isStoreSaving ? <DashboardSpinner className="h-4 w-4" /> : <FiCheck className="h-4 w-4" aria-hidden="true" />}
                  {isStoreSaving ? 'Saving...' : editingStore ? 'Save changes' : 'Create store'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDeleteStore && (
        <>
          <button
            type="button"
            aria-label="Close delete confirmation overlay"
            onClick={() => setConfirmDeleteStore(null)}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <FiAlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Deactivate store</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This sets <span className="font-semibold">{confirmDeleteStore.name}</span> to inactive. Existing
                    orders and linked data are preserved.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteStore(null)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 sm:min-h-0"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteStore(confirmDeleteStore)}
                  disabled={isStoreDeleting}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-0"
                >
                  {isStoreDeleting && <DashboardSpinner className="h-3.5 w-3.5" />}
                  {!isStoreDeleting && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                  {isStoreDeleting ? 'Working...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
