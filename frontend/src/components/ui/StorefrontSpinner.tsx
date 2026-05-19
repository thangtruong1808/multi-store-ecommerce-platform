type StorefrontSpinnerProps = {
  className?: string
}

/** Small loading indicator for storefront pages while backend requests are in progress. */
export function StorefrontSpinner({ className = 'h-4 w-4' }: StorefrontSpinnerProps) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600 ${className}`}
      aria-hidden="true"
    />
  )
}
