import type { ReactNode } from 'react'

import { DashboardSpinner } from '../../DashboardSpinner'

type OverviewChartCardProps = {
  title: string
  description: string
  isLoading?: boolean
  children: ReactNode
  className?: string
}

export function OverviewChartCard({
  title,
  description,
  isLoading = false,
  children,
  className = '',
}: OverviewChartCardProps) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}
      aria-busy={isLoading}
    >
      <div className="mb-2 shrink-0">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{description}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white/85"
            role="status"
            aria-live="polite"
          >
            <DashboardSpinner className="h-5 w-5" />
            <span className="text-xs text-slate-600">Loading chart…</span>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
