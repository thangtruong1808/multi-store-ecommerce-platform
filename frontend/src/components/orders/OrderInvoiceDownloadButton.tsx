import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'

import {
  downloadOrderInvoice,
  isOrderInvoiceAvailable,
} from '../../features/orders/downloadOrderInvoice'

type OrderInvoiceDownloadButtonProps = {
  orderId: string
  orderNumber: string
  paymentStatus: string
}

export function OrderInvoiceDownloadButton({
  orderId,
  orderNumber,
  paymentStatus,
}: OrderInvoiceDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canDownload = isOrderInvoiceAvailable(paymentStatus)

  const handleClick = async () => {
    if (!canDownload || isDownloading) {
      return
    }
    setError(null)
    setIsDownloading(true)
    try {
      await downloadOrderInvoice(orderId, orderNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download invoice.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={!canDownload || isDownloading}
        aria-busy={isDownloading}
        title={
          canDownload
            ? 'Download invoice (PDF)'
            : 'Invoice available after payment is completed'
        }
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDownloading ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
            aria-hidden="true"
          />
        ) : (
          <FiDownload className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isDownloading ? 'Preparing…' : 'PDF'}</span>
        {isDownloading ? <span className="sr-only">Generating invoice</span> : null}
      </button>
      {error ? (
        <span className="max-w-[10rem] text-right text-xs text-rose-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
