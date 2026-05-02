import type { Dispatch, SetStateAction } from 'react'

import { PAGE_SIZE_OPTIONS } from './dashboardConstants'

type DashboardDataTableTopBarProps = {
  currentItems: number
  totalItems: number
  pageSize: number
  setPageSize: Dispatch<SetStateAction<number>>
}

export function DashboardDataTableTopBar({
  currentItems,
  totalItems,
  pageSize,
  setPageSize,
}: DashboardDataTableTopBarProps) {
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Show <span className="font-semibold text-slate-800">{currentItems}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalItems}</span> items
      </p>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Items per page
        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring focus:ring-sky-100"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
