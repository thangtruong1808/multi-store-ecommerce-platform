import type { DashboardFeatureKey } from './dashboardTypes'

type DashboardDataTableHeadProps = {
  activeFeature: DashboardFeatureKey
}

export function DashboardDataTableHead({ activeFeature }: DashboardDataTableHeadProps) {
  return (
    <thead className="bg-slate-50">
      <tr className="text-left text-slate-600">
        {activeFeature === 'users' ? (
          <>
            <th className="px-3 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 font-medium">Email</th>
            <th className="px-3 py-2.5 font-medium">Role</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </>
        ) : activeFeature === 'categories' ? (
          <>
            <th className="px-3 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 font-medium">Slug</th>
            <th className="px-3 py-2.5 font-medium">Hierarchy</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </>
        ) : activeFeature === 'products' ? (
          <>
            <th className="px-3 py-2.5 font-medium">Product</th>
            <th className="px-3 py-2.5 font-medium">Category</th>
            <th className="px-3 py-2.5 font-medium">Media</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </>
        ) : activeFeature === 'activityLogs' ? (
          <>
            <th className="px-3 py-2.5 font-medium">Full Name</th>
            <th className="px-3 py-2.5 font-medium">Email</th>
            <th className="px-3 py-2.5 font-medium">Action</th>
            <th className="px-3 py-2.5 font-medium">Date & Time</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </>
        ) : (
          <>
            <th className="px-3 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 font-medium">Detail</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </>
        )}
      </tr>
    </thead>
  )
}
