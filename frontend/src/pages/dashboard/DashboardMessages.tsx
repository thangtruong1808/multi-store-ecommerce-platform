type DashboardMessagesProps = {
  aggregateError: string | null
  inlineStatusMessage: string | null
  inlineStatusType: 'success' | 'info' | 'error'
}

export function DashboardMessages({
  aggregateError,
  inlineStatusMessage,
  inlineStatusType,
}: DashboardMessagesProps) {
  return (
    <>
      {aggregateError && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{aggregateError}</p>
      )}
      {inlineStatusMessage && (
        <p
          className={`mb-3 text-xs ${
            inlineStatusType === 'error'
              ? 'text-red-600'
              : inlineStatusType === 'success'
                ? 'text-emerald-600'
                : 'text-slate-600'
          }`}
        >
          {inlineStatusMessage}
        </p>
      )}
    </>
  )
}
