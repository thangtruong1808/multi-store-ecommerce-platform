import BrandMark from '../components/BrandMark'
import { StorefrontSpinner } from '../components/ui/StorefrontSpinner'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type MaintenancePageProps = {
  message: string | null
  onRetry: () => void
  isRetrying: boolean
}

export function MaintenancePage({ message, onRetry, isRetrying }: MaintenancePageProps) {
  useDocumentTitle('Maintenance')

  const displayMessage =
    message?.trim() ||
    'We are currently under maintenance. Please come back later.'

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-sm sm:p-8" role="status" aria-live="polite">
        <div className="flex justify-center">
          <BrandMark />
        </div>

        <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          We&apos;ll be back soon
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{displayMessage}</p>

        <p className="mt-2 text-xs text-slate-500">
          Our team is working to restore the store. Thank you for your patience.
        </p>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:w-auto sm:min-w-[10rem]"
        >
          {isRetrying ? <StorefrontSpinner className="h-4 w-4 border-white/40 border-t-white" /> : null}
          {isRetrying ? 'Checking…' : 'Try again'}
        </button>
      </div>
    </div>
  )
}

export function SystemHealthLoadingPage() {
  useDocumentTitle('Loading')

  return (
    <div
      className="flex min-h-screen min-w-0 flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <StorefrontSpinner className="h-8 w-8" />
      <p className="text-sm text-slate-600">Connecting to the store…</p>
      <span className="sr-only">Checking store availability</span>
    </div>
  )
}
