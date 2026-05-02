import type { Dispatch, SetStateAction } from 'react'

type DashboardDataTableFooterProps = {
  page: number
  setPage: Dispatch<SetStateAction<number>>
  totalPages: number
  safePage: number
}

export function DashboardDataTableFooter({ page, setPage, totalPages, safePage }: DashboardDataTableFooterProps) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Page {safePage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  )
}
