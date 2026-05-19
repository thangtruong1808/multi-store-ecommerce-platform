import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'

import { DashboardSpinner } from '../DashboardSpinner'
import { downloadDashboardInvoice, isDashboardInvoiceDownloadable } from './downloadDashboardInvoice'

type DashboardInvoiceDownloadButtonProps = {
  orderId: string
  orderNumber: string
  paymentStatus: string
}

export function DashboardInvoiceDownloadButton({
  orderId,
  orderNumber,
  paymentStatus,
}: DashboardInvoiceDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canDownload = isDashboardInvoiceDownloadable(paymentStatus)

  const handleClick = async () => {
    if (!canDownload || isDownloading) {
      return
    }
    setError(null)
    setIsDownloading(true)
    try {
      await downloadDashboardInvoice(orderId, orderNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download invoice.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={!canDownload || isDownloading}
        aria-busy={isDownloading}
        title={canDownload ? 'Download invoice (PDF)' : 'Invoice available after payment is completed'}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDownloading ? <DashboardSpinner className="h-3 w-3" /> : <FiDownload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        {isDownloading ? 'Preparing…' : 'PDF'}
      </button>
      {error ? (
        <span className="max-w-[8rem] text-xs text-rose-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
