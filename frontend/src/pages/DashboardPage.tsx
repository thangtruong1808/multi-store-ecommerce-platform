import { Navigate } from 'react-router-dom'

import { DashboardSidebar } from './dashboard/DashboardSidebar'
import { DashboardWorkspace } from './dashboard/DashboardWorkspace'
import { useDashboardModel } from './dashboard/hooks/useDashboardModel'

function DashboardPage() {
  const model = useDashboardModel()

  if (!model.isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div
      className={`relative min-h-screen w-full bg-slate-100 lg:grid ${
        model.isSidebarCollapsed ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'
      }`}
    >
      {model.isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => model.setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <DashboardSidebar
        activeFeature={model.activeFeature}
        setActiveFeature={model.setActiveFeature}
        isSidebarOpen={model.isSidebarOpen}
        setIsSidebarOpen={model.setIsSidebarOpen}
        isSidebarCollapsed={model.isSidebarCollapsed}
        setIsSidebarCollapsed={model.setIsSidebarCollapsed}
        isHydrated={model.isHydrated}
        isLoading={model.isLoading}
        fullName={model.fullName}
        userRole={model.userRole}
        isNavigatingHome={model.isNavigatingHome}
        onBackToFrontend={model.handleBackToFrontend}
        actionLoading={model.actionLoading}
        onLogout={() => void model.handleLogout()}
      />

      <DashboardWorkspace model={model} />
    </div>
  )
}

export default DashboardPage
