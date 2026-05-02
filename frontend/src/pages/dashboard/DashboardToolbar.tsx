import type { Dispatch, SetStateAction } from 'react'
import { FiMenu, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import { sideBarItems } from './dashboardConstants'
import type { DashboardFeatureKey } from './dashboardTypes'

type DashboardToolbarProps = {
  activeFeature: DashboardFeatureKey
  isSidebarOpen: boolean
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>
  isFeatureLoading: boolean
}

export function DashboardToolbar({
  activeFeature,
  isSidebarOpen,
  setIsSidebarOpen,
  isFeatureLoading,
}: DashboardToolbarProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          aria-expanded={isSidebarOpen}
          aria-controls="dashboard-sidebar"
        >
          {isSidebarOpen ? <FiX className="h-4 w-4" aria-hidden="true" /> : <FiMenu className="h-4 w-4" aria-hidden="true" />}
          {isSidebarOpen ? 'Close menu' : 'Open menu'}
        </button>
        {isFeatureLoading && (
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <DashboardSpinner className="h-3.5 w-3.5" />
            Updating view...
          </div>
        )}
      </div>

      <div className="mb-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {sideBarItems.find((item) => item.key === activeFeature)?.label}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage {sideBarItems.find((item) => item.key === activeFeature)?.label?.toLowerCase()} in one place.
          </p>
        </div>
      </div>
    </>
  )
}
