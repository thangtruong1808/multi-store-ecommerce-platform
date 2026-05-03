import type { Dispatch, SetStateAction } from 'react'
import { FiAlertTriangle, FiCheck, FiTrash2, FiUsers, FiX } from 'react-icons/fi'

import { DashboardSpinner } from './DashboardSpinner'
import type { EditUserFormState, ManagedStoreOption, UserItem } from './dashboardTypes'

type DashboardUserModalsProps = {
  editingUser: UserItem | null
  onCloseEdit: () => void
  editForm: EditUserFormState
  setEditForm: Dispatch<SetStateAction<EditUserFormState>>
  hasEditChanges: boolean
  isEditSaving: boolean
  onSaveUser: () => void
  isAdminSession: boolean
  adminStoreOptions: ManagedStoreOption[]
  isUserStoreDataLoading: boolean
  toggleUserManagedStore: (storeId: string) => void
  confirmDeleteUser: UserItem | null
  setConfirmDeleteUser: (user: UserItem | null) => void
  isDeleteLoading: boolean
  onSoftDeleteUser: (user: UserItem) => void
}

export function DashboardUserModals({
  editingUser,
  onCloseEdit,
  editForm,
  setEditForm,
  hasEditChanges,
  isEditSaving,
  onSaveUser,
  isAdminSession,
  adminStoreOptions,
  isUserStoreDataLoading,
  toggleUserManagedStore,
  confirmDeleteUser,
  setConfirmDeleteUser,
  isDeleteLoading,
  onSoftDeleteUser,
}: DashboardUserModalsProps) {
  return (
    <>
      {editingUser && (
        <>
          <button
            type="button"
            aria-label="Close edit user modal overlay"
            onClick={onCloseEdit}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <FiUsers className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">Edit user profile</h2>
                    <p className="mt-1 text-sm text-slate-500">Update identity details, access role and account status.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close edit user form"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  First name
                  <input
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="First name"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last name
                  <input
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="Last name"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Email
                  <input
                    value={editForm.email}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="Email"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mobile (optional)
                  <input
                    value={editForm.mobile}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, mobile: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                    placeholder="Mobile"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                  <select
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, role: event.target.value as UserItem['role'] }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring focus:ring-sky-100"
                  >
                    <option value="admin">admin</option>
                    <option value="store_manager">store_manager</option>
                    <option value="staff">staff</option>
                    <option value="customer">customer</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-100"
                  />
                  Active user
                </label>

                {isAdminSession && (editForm.role === 'store_manager' || editForm.role === 'staff') ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/90 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Assigned stores</p>
                    <p className="text-xs text-slate-500">Links this user to stores via store_staff (dashboard product scope).</p>
                    {isUserStoreDataLoading ? (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <DashboardSpinner className="h-4 w-4" />
                        Loading stores…
                      </div>
                    ) : (
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                        {adminStoreOptions.length === 0 ? (
                          <p className="text-sm text-slate-500">No stores exist yet. Create a store first.</p>
                        ) : (
                          adminStoreOptions.map((m) => (
                            <label
                              key={m.id}
                              className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600"
                                checked={editForm.managedStoreIds.includes(m.id)}
                                onChange={() => toggleUserManagedStore(m.id)}
                              />
                              <span>
                                <span className="font-medium text-slate-800">{m.name}</span>
                                <span className="ml-1 text-xs text-slate-500">{m.slug}</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveUser}
                  disabled={isEditSaving || !hasEditChanges}
                  className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isEditSaving && <DashboardSpinner className="h-3.5 w-3.5 border-white/40 border-t-white" />}
                  {!isEditSaving && <FiCheck className="h-4 w-4" aria-hidden="true" />}
                  {isEditSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDeleteUser && (
        <>
          <button
            type="button"
            aria-label="Close delete confirmation overlay"
            onClick={() => setConfirmDeleteUser(null)}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <FiAlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Confirm soft delete</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This will deactivate{' '}
                    <span className="font-semibold">
                      {confirmDeleteUser.firstName} {confirmDeleteUser.lastName}
                    </span>
                    . They can no longer sign in unless reactivated.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteUser(null)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSoftDeleteUser(confirmDeleteUser)}
                  disabled={isDeleteLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeleteLoading && <DashboardSpinner className="h-3.5 w-3.5" />}
                  {!isDeleteLoading && <FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                  {isDeleteLoading ? 'Deleting...' : 'Confirm delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
