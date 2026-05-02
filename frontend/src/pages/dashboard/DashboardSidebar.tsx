import type { Dispatch, SetStateAction } from 'react'
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi'

import BrandMark from '../../components/BrandMark'
import { DashboardSpinner } from './DashboardSpinner'
import { sideBarItems } from './dashboardConstants'
import type { DashboardFeatureKey } from './dashboardTypes'

type DashboardSidebarProps = {
  activeFeature: DashboardFeatureKey
  setActiveFeature: (key: DashboardFeatureKey) => void
  isSidebarOpen: boolean
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>
  isHydrated: boolean
  isLoading: boolean
  fullName: string
  userRole: string
  isNavigatingHome: boolean
  onBackToFrontend: () => void
  actionLoading: boolean
  onLogout: () => void
}

export function DashboardSidebar({
  activeFeature,
  setActiveFeature,
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isHydrated,
  isLoading,
  fullName,
  userRole,
  isNavigatingHome,
  onBackToFrontend,
  actionLoading,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <aside
      id="dashboard-sidebar"
      className={`fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white p-4 shadow-lg transition-all duration-200 lg:static lg:translate-x-0 lg:shadow-none ${isSidebarCollapsed ? 'w-[88px]' : 'w-[280px]'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} `}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 pb-4">
          <div className={`flex items-start ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            {!isSidebarCollapsed && <BrandMark />}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="hidden rounded-md border border-slate-300 px-2 py-2.5 text-slate-600 transition hover:bg-slate-50 sm:py-3 lg:inline-flex"

              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <FiChevronRight className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {!isSidebarCollapsed && <p className="mt-2 text-xs text-slate-500">Admin dashboard</p>}
          {!isSidebarCollapsed && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Signed in as</p>
              {!isHydrated || isLoading ? (
                <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                  <DashboardSpinner className="h-3.5 w-3.5" />
                  Loading user...
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{fullName}</p>
                  <p className="text-xs text-slate-600">Role: {userRole}</p>
                </>
              )}
            </div>
          )}
        </div>
        {!isSidebarCollapsed && (
          <h2 className="mb-2 mt-4 px-2 text-sm font-semibold text-slate-700">Dashboard Features</h2>
        )}
        <nav className="space-y-1" aria-label="Dashboard feature navigation">
          {sideBarItems.map(({ key, label, icon: Icon }) => {
            const isActive = activeFeature === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveFeature(key)
                  setIsSidebarOpen(false)
                }}
                className={`flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm transition sm:py-3 ${isSidebarCollapsed ? 'justify-center min-h-[44px]' : 'gap-2'
                  } ${isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                title={isSidebarCollapsed ? label : undefined}
              >
                <Icon className={isSidebarCollapsed ? 'h-7 w-7 shrink-0' : 'h-4 w-4'} aria-hidden />
                {!isSidebarCollapsed && label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onBackToFrontend}
            disabled={isNavigatingHome}
            className={`mb-2 inline-flex w-full items-center rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3 ${isSidebarCollapsed ? 'justify-center min-h-[44px]' : 'gap-2'
              }`}
            title={isSidebarCollapsed ? 'Back to Frontend' : undefined}
          >
            {isNavigatingHome ? (
              <DashboardSpinner className={isSidebarCollapsed ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
            ) : (
              <FiArrowLeft className={isSidebarCollapsed ? 'h-7 w-7 shrink-0' : 'h-4 w-4'} aria-hidden="true" />
            )}
            {!isSidebarCollapsed && (isNavigatingHome ? 'Opening storefront...' : 'Back to Frontend')}
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={actionLoading}
            className={`inline-flex w-full items-center rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3 ${isSidebarCollapsed ? 'justify-center min-h-[44px]' : 'gap-2'
              }`}
            title={isSidebarCollapsed ? 'Logout' : undefined}
          >
            {actionLoading ? (
              <DashboardSpinner className={isSidebarCollapsed ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
            ) : (
              <FiLogOut className={isSidebarCollapsed ? 'h-7 w-7 shrink-0' : 'h-4 w-4'} aria-hidden="true" />
            )}
            {!isSidebarCollapsed && (actionLoading ? 'Signing out...' : 'Logout')}
          </button>
        </div>
      </div>
    </aside>
  )
}
