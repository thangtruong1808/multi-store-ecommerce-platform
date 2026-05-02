import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { ProductItem } from './dashboardTypes'

type DashboardProductDeleteModalProps = {
  confirmDeleteProduct: ProductItem
  setConfirmDeleteProduct: (product: ProductItem | null) => void
  isProductDeleting: boolean
  onDeleteProduct: (product: ProductItem) => void
}

export function DashboardProductDeleteModal({
  confirmDeleteProduct,
  setConfirmDeleteProduct,
  isProductDeleting,
  onDeleteProduct,
}: DashboardProductDeleteModalProps) {
  return (
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
              onClick={() => onDeleteProduct(confirmDeleteProduct)}
              disabled={isProductDeleting}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProductDeleting && <DashboardSpinner className="h-3.5 w-3.5" />}
              {!isProductDeleting && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
              {isProductDeleting ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
