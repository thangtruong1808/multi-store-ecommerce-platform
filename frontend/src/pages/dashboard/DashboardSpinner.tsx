type DashboardSpinnerProps = {
  className?: string
}

export function DashboardSpinner({ className = 'h-4 w-4' }: DashboardSpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-sky-200 border-t-sky-600 ${className}`}
      aria-hidden="true"
    />
  )
}
