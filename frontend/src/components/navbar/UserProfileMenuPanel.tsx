import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiGrid, FiLogOut, FiMail, FiMapPin, FiPackage, FiShield, FiUser } from 'react-icons/fi'

import { UserAvatarCircle } from '../auth/UserAvatarCircle'
import { shouldShowStoreLocation, useProfileMenuStores } from './useProfileMenuStores'

const GRID_COLS = 'grid-cols-4'

const MENU_TILE_SURFACE =
  'flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 py-2.5'
const MENU_TILE_INTERACTIVE =
  `${MENU_TILE_SURFACE} transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60`
const MENU_TILE_ICON =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/80'
const MENU_TILE_LABEL = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500'
const MENU_TILE_VALUE =
  'line-clamp-2 max-w-full text-center text-[11px] font-medium leading-snug text-slate-800 sm:text-xs'
const MENU_TILE_ACTION_LABEL = 'text-center text-[11px] font-medium leading-tight text-slate-800 sm:text-xs'

function MenuTileSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
      aria-hidden="true"
    />
  )
}

type InfoTileProps = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: string
  isLoading?: boolean
  title?: string
}

function InfoTile({ icon: Icon, label, value, isLoading = false, title }: InfoTileProps) {
  return (
    <div className={MENU_TILE_SURFACE} title={title ?? value}>
      <span className={MENU_TILE_ICON}>{isLoading ? <MenuTileSpinner /> : <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}</span>
      <span className={MENU_TILE_LABEL}>{label}</span>
      <span className={MENU_TILE_VALUE}>{isLoading ? 'Loading…' : value}</span>
    </div>
  )
}

type ProfileAvatarTileProps = {
  to: string
  label: string
  initials: string
  avatarImageUrl?: string | null
  isAvatarLoading: boolean
  onAction?: () => void
  disabled?: boolean
}

function ProfileAvatarTile({
  to,
  label,
  initials,
  avatarImageUrl = null,
  isAvatarLoading,
  onAction,
  disabled = false,
}: ProfileAvatarTileProps) {
  const content = (
    <>
      <span className="flex items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-slate-200/80">
        <UserAvatarCircle
          imageUrl={avatarImageUrl}
          initials={initials}
          isBusy={isAvatarLoading}
          sizeClassName="h-14 w-14 sm:h-16 sm:w-16"
          roundedClassName="rounded-md"
          textClassName="text-sm font-semibold sm:text-base"
          ariaLabel=""
        />
      </span>
      <span className={MENU_TILE_LABEL}>{label}</span>
    </>
  )

  if (disabled) {
    return (
      <div className={`${MENU_TILE_INTERACTIVE} cursor-not-allowed opacity-60`} aria-disabled="true">
        {content}
      </div>
    )
  }

  return (
    <Link to={to} className={MENU_TILE_INTERACTIVE} onClick={onAction}>
      {content}
    </Link>
  )
}

type ActionTileProps = {
  to?: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  onAction?: () => void
  disabled?: boolean
  isBusy?: boolean
  children?: ReactNode
}

function ActionTile({ to, icon: Icon, label, onAction, disabled = false, isBusy = false, children }: ActionTileProps) {
  const body = (
    <>
      <span className={MENU_TILE_ICON}>
        {children ?? (isBusy ? <MenuTileSpinner /> : <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />)}
      </span>
      <span className={MENU_TILE_ACTION_LABEL}>{label}</span>
    </>
  )

  if (to && !disabled) {
    return (
      <Link to={to} className={MENU_TILE_INTERACTIVE} onClick={onAction}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" className={MENU_TILE_INTERACTIVE} onClick={onAction} disabled={disabled || isBusy}>
      {body}
    </button>
  )
}

type UserProfileMenuPanelProps = {
  isOpen: boolean
  firstName?: string
  lastName?: string
  userEmail?: string
  role?: string
  initials: string
  avatarImageUrl?: string | null
  showDashboardLink: boolean
  isSessionLoading: boolean
  isAvatarBusy?: boolean
  isSigningOut: boolean
  onCloseMenu: () => void
  onSignOut: () => void
}

export function UserProfileMenuPanel({
  isOpen,
  firstName,
  lastName,
  userEmail,
  role,
  initials,
  avatarImageUrl = null,
  showDashboardLink,
  isSessionLoading,
  isAvatarBusy = false,
  isSigningOut,
  onCloseMenu,
  onSignOut,
}: UserProfileMenuPanelProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'User'
  const roleLabel = role?.replace(/_/g, ' ') ?? 'member'
  const emailLabel = userEmail?.trim() || 'No email'
  const showStore = shouldShowStoreLocation(role)
  const { storeLocationLabel, isStoreLocationLoading } = useProfileMenuStores(isOpen, role)

  const isPanelBusy = isSessionLoading
  const isActionsDisabled = isSessionLoading || isSigningOut
  const isAvatarLoading = isSessionLoading || isAvatarBusy

  return (
    <div
      className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-0.75rem),22rem)] rounded-xl border border-slate-200 bg-white shadow-lg sm:w-[28rem]"
      role="menu"
      aria-label="Account menu"
    >
      <div className="relative p-3" aria-busy={isPanelBusy}>
        {isPanelBusy ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/90"
            role="status"
            aria-live="polite"
          >
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600">Loading account…</span>
          </div>
        ) : null}

        {/* Row 1 — account fields, each in its own tile */}
        <div className={`grid ${GRID_COLS} gap-2`}>
          <ProfileAvatarTile
            to="/profile"
            label="Profile"
            initials={initials}
            avatarImageUrl={avatarImageUrl}
            isAvatarLoading={isAvatarLoading}
            onAction={isActionsDisabled ? undefined : onCloseMenu}
            disabled={isActionsDisabled}
          />
          <InfoTile
            icon={FiUser}
            label="Name"
            value={displayName}
            isLoading={isSessionLoading}
            title={displayName}
          />
          <InfoTile
            icon={FiMail}
            label="Email"
            value={emailLabel}
            isLoading={isSessionLoading}
            title={emailLabel}
          />
          <InfoTile
            icon={FiShield}
            label="Role"
            value={roleLabel}
            isLoading={isSessionLoading}
            title={roleLabel}
          />
        </div>

        {/* Row 2 — store (if applicable) + shortcuts */}
        <div className={`mt-2 grid ${GRID_COLS} gap-2`}>
          {showStore ? (
            <InfoTile
              icon={FiMapPin}
              label="Store"
              value={storeLocationLabel ?? '—'}
              isLoading={isStoreLocationLoading}
              title={storeLocationLabel ?? undefined}
            />
          ) : (
            <ActionTile
              to="/orders"
              icon={FiPackage}
              label="Orders"
              onAction={onCloseMenu}
              disabled={isActionsDisabled}
            />
          )}

          {showDashboardLink ? (
            <ActionTile
              to="/dashboard"
              icon={FiGrid}
              label="Dashboard"
              onAction={onCloseMenu}
              disabled={isActionsDisabled}
            />
          ) : showStore ? (
            <ActionTile
              to="/orders"
              icon={FiPackage}
              label="Orders"
              onAction={onCloseMenu}
              disabled={isActionsDisabled}
            />
          ) : (
            <span className="min-h-[80px]" aria-hidden="true" />
          )}

          {showStore && showDashboardLink ? (
            <ActionTile
              to="/orders"
              icon={FiPackage}
              label="Orders"
              onAction={onCloseMenu}
              disabled={isActionsDisabled}
            />
          ) : (
            <span className="min-h-[80px]" aria-hidden="true" />
          )}

          <ActionTile
            icon={FiLogOut}
            label={isSigningOut ? 'Signing out…' : 'Sign out'}
            onAction={() => {
              if (!isSigningOut) {
                onSignOut()
              }
            }}
            disabled={isActionsDisabled}
            isBusy={isSigningOut}
          />
        </div>
      </div>
    </div>
  )
}
