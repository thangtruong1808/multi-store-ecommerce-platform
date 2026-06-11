import type { ReactNode } from 'react'

import BrandMark from '../components/BrandMark'
import { StorefrontSpinner } from '../components/ui/StorefrontSpinner'
import type { HealthFailureReason } from '../features/system/healthApi'
import {
  copyForHealthFailure,
  LOADING_COPY,
  WAKE_UP_COPY,
} from '../features/system/storeAvailabilityCopy'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type WakeProgressIndicatorProps = {
  active: boolean
}

function WakeProgressIndicator({ active }: WakeProgressIndicatorProps) {
  return (
    <div
      className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-20 sm:w-20"
      aria-hidden="true"
    >
      {active ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-sky-200/50 motion-reduce:animate-none" />
      ) : null}
      <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-slate-50 ring-2 ring-sky-100/90 shadow-sm sm:h-[4.25rem] sm:w-[4.25rem]">
        <StorefrontSpinner className="h-7 w-7 sm:h-8 sm:w-8" />
      </span>
    </div>
  )
}

type StoreAvailabilityCardProps = {
  title: string
  body: string
  sub: string
  showWakeAnimation: boolean
  isBusy: boolean
  action?: ReactNode
}

function StoreAvailabilityCard({
  title,
  body,
  sub,
  showWakeAnimation,
  isBusy,
  action,
}: StoreAvailabilityCardProps) {
  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90 px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-sm sm:p-8"
        role="status"
        aria-live="polite"
        aria-busy={isBusy}
      >
        <div className="flex justify-center">
          <BrandMark />
        </div>

        <div className="mt-6">
          <WakeProgressIndicator active={showWakeAnimation || isBusy} />
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{body}</p>

        <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{sub}</p>

        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  )
}

type MaintenancePageProps = {
  reason: HealthFailureReason
  message: string | null
  onRetry: () => void
  isRetrying: boolean
}

export function MaintenancePage({ reason, message, onRetry, isRetrying }: MaintenancePageProps) {
  const copy = copyForHealthFailure(reason, message)
  useDocumentTitle(copy.showWakeAnimation ? 'Starting up' : 'Maintenance')

  const isWaking = copy.showWakeAnimation

  return (
    <StoreAvailabilityCard
      title={copy.title}
      body={copy.body}
      sub={isWaking && isRetrying ? 'Checking connection…' : copy.sub}
      showWakeAnimation={copy.showWakeAnimation}
      isBusy={isWaking || isRetrying}
      action={
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:w-auto sm:min-w-[10rem]"
        >
          {isRetrying ? (
            <StorefrontSpinner className="h-4 w-4 border-white/40 border-t-white" />
          ) : null}
          {isRetrying ? WAKE_UP_COPY.retryingLabel : WAKE_UP_COPY.retryLabel}
        </button>
      }
    />
  )
}

export function SystemHealthLoadingPage() {
  useDocumentTitle('Starting up')

  return (
    <StoreAvailabilityCard
      title={LOADING_COPY.title}
      body={LOADING_COPY.body}
      sub={WAKE_UP_COPY.sub}
      showWakeAnimation
      isBusy
    />
  )
}
