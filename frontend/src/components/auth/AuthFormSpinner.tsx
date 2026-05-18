type AuthFormSpinnerProps = {
  className?: string
}

export function AuthFormSpinner({ className = 'h-4 w-4' }: AuthFormSpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
      aria-hidden="true"
    />
  )
}
