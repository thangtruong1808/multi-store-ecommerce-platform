import { FiPlus, FiSearch } from 'react-icons/fi'

import type { CategoryParentOption } from './dashboardTypes'

type DashboardCategoryFiltersProps = {
  categoryFilterLevel: 'all' | '1' | '2' | '3'
  setCategoryFilterLevel: (v: 'all' | '1' | '2' | '3') => void
  setCategoryFilterParentId: (v: 'all' | string) => void
  categoryFilterParentId: 'all' | string
  isCategoryParentsLoading: boolean
  categoryParentOptions: CategoryParentOption[]
  categorySearchInput: string
  setCategorySearchInput: (v: string) => void
  onApplyCategorySearch: () => void
  onOpenCreateCategory: () => void
}

export function DashboardCategoryFilters({
  categoryFilterLevel,
  setCategoryFilterLevel,
  setCategoryFilterParentId,
  categoryFilterParentId,
  isCategoryParentsLoading,
  categoryParentOptions,
  categorySearchInput,
  setCategorySearchInput,
  onApplyCategorySearch,
  onOpenCreateCategory,
}: DashboardCategoryFiltersProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-medium text-slate-600">
        Level
        <select
          value={categoryFilterLevel}
          onChange={(event) => {
            setCategoryFilterLevel(event.target.value as 'all' | '1' | '2' | '3')
            setCategoryFilterParentId('all')
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          <option value="all">All levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Parent
        <select
          value={categoryFilterParentId}
          onChange={(event) => setCategoryFilterParentId(event.target.value)}
          disabled={categoryFilterLevel === 'all' || categoryFilterLevel === '1' || isCategoryParentsLoading}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="all">All parents</option>
          {categoryParentOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600 sm:col-span-2">
        Search
        <div className="mt-1 flex items-center gap-2">
          <input
            value={categorySearchInput}
            onChange={(event) => setCategorySearchInput(event.target.value)}
            placeholder="Search by name or slug"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={onApplyCategorySearch}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <FiSearch className="h-4 w-4" aria-hidden="true" />
            Apply
          </button>
        </div>
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onOpenCreateCategory}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create
        </button>
      </div>
    </div>
  )
}
