import { FiPlus, FiSearch } from 'react-icons/fi'

import type { ManagedStoreOption } from './dashboardTypes'

type DashboardVoucherFiltersProps = {
  voucherSearchInput: string
  setVoucherSearchInput: (v: string) => void
  onApplyVoucherSearch: () => void
  voucherFilterStatus: 'all' | 'Active' | 'Expired' | 'Scheduled' | 'Inactive' | 'Exhausted'
  setVoucherFilterStatus: (
    v: 'all' | 'Active' | 'Expired' | 'Scheduled' | 'Inactive' | 'Exhausted',
  ) => void
  voucherFilterStoreId: 'all' | string
  setVoucherFilterStoreId: (v: 'all' | string) => void
  managedStores: ManagedStoreOption[]
  onOpenCreateVoucher: () => void
}

export function DashboardVoucherFilters({
  voucherSearchInput,
  setVoucherSearchInput,
  onApplyVoucherSearch,
  voucherFilterStatus,
  setVoucherFilterStatus,
  voucherFilterStoreId,
  setVoucherFilterStoreId,
  managedStores,
  onOpenCreateVoucher,
}: DashboardVoucherFiltersProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-medium text-slate-600 lg:col-span-2">
        Search
        <div className="mt-1 flex gap-2">
          <input
            type="search"
            value={voucherSearchInput}
            onChange={(e) => setVoucherSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApplyVoucherSearch()
            }}
            placeholder="Code or description"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={onApplyVoucherSearch}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FiSearch className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Search</span>
          </button>
        </div>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Status
        <select
          value={voucherFilterStatus}
          onChange={(e) =>
            setVoucherFilterStatus(
              e.target.value as
                | 'all'
                | 'Active'
                | 'Expired'
                | 'Scheduled'
                | 'Inactive'
                | 'Exhausted',
            )
          }
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Expired">Expired</option>
          <option value="Exhausted">Exhausted</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Store
        <select
          value={voucherFilterStoreId}
          onChange={(e) => setVoucherFilterStoreId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          <option value="all">All stores</option>
          {managedStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onOpenCreateVoucher}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 sm:min-h-0"
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create voucher
        </button>
      </div>
    </div>
  )
}
