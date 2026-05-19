type AccountMenuGridIconProps = {
  isBusy?: boolean
}

export function AccountMenuGridIcon({ isBusy = false }: AccountMenuGridIconProps) {
  if (isBusy) {
    return (
      <span
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
        role="status"
        aria-label="Loading account menu"
      />
    )
  }

  return (
    <span className="grid grid-cols-3 gap-[2px]" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className="h-[3px] w-[3px] rounded-full bg-current" />
      ))}
    </span>
  )
}
