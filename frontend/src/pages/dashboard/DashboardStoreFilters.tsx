import { FiPlus, FiSearch } from 'react-icons/fi'

type DashboardStoreFiltersProps = {
  storeSearchInput: string
  setStoreSearchInput: (v: string) => void
  onApplyStoreSearch: () => void
  onOpenCreateStore: () => void
  canMutateStores: boolean
}

export function DashboardStoreFilters({
  storeSearchInput,
  setStoreSearchInput,
  onApplyStoreSearch,
  onOpenCreateStore,
  canMutateStores,
}: DashboardStoreFiltersProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-3">
        Search
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={storeSearchInput}
            onChange={(event) => setStoreSearchInput(event.target.value)}
            placeholder="Search by name or slug"
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100 sm:py-1.5"
          />
          <button
            type="button"
            onClick={onApplyStoreSearch}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 sm:min-h-0 sm:py-1.5"
          >
            <FiSearch className="h-4 w-4" aria-hidden="true" />
            Apply
          </button>
        </div>
      </label>
      <div className="flex items-end">
        {canMutateStores ? (
          <button
            type="button"
            onClick={onOpenCreateStore}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:min-h-0"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create store
          </button>
        ) : (
          <p className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Store management is limited to administrators.
          </p>
        )}
      </div>
    </div>
  )
}
