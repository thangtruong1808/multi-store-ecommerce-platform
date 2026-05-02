import { FiPlus, FiSearch } from 'react-icons/fi'

import type { CategoryParentOption } from './dashboardTypes'

type DashboardProductFiltersProps = {
  productFilterStatus: 'all' | 'active' | 'inactive' | 'draft'
  setProductFilterStatus: (v: 'all' | 'active' | 'inactive' | 'draft') => void
  productFilterCategoryId: 'all' | string
  setProductFilterCategoryId: (v: 'all' | string) => void
  productCategoriesTree: CategoryParentOption[]
  productSearchInput: string
  setProductSearchInput: (v: string) => void
  onApplyProductSearch: () => void
  onOpenCreateProduct: () => void
}

export function DashboardProductFilters({
  productFilterStatus,
  setProductFilterStatus,
  productFilterCategoryId,
  setProductFilterCategoryId,
  productCategoriesTree,
  productSearchInput,
  setProductSearchInput,
  onApplyProductSearch,
  onOpenCreateProduct,
}: DashboardProductFiltersProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-medium text-slate-600">
        Status
        <select
          value={productFilterStatus}
          onChange={(event) => setProductFilterStatus(event.target.value as 'all' | 'active' | 'inactive' | 'draft')}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          <option value="all">All status</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="draft">draft</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Category (leaf)
        <select
          value={productFilterCategoryId}
          onChange={(event) => setProductFilterCategoryId(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          <option value="all">All categories</option>
          {productCategoriesTree
            .filter((item) => item.level === 3)
            .map((item) => (
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
            value={productSearchInput}
            onChange={(event) => setProductSearchInput(event.target.value)}
            placeholder="Search by name or SKU"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={onApplyProductSearch}
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
          onClick={onOpenCreateProduct}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create
        </button>
      </div>
    </div>
  )
}
