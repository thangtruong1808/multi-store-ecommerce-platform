import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { formatAudAmount } from '../components/home/formatAud'
import {
  fetchCustomerOrders,
  type CustomerOrderListItem,
} from '../features/orders/customerOrdersApi'

function formatOrderLabels(status: string, paymentStatus: string): string {
  const s = status.replace(/_/g, ' ')
  const p = paymentStatus.replace(/_/g, ' ')
  return `${s} · ${p}`
}

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<CustomerOrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await fetchCustomerOrders(50)
        if (!cancelled) {
          setOrders(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Order history</h1>
      <p className="mt-2 text-sm text-slate-600">Orders you have placed while signed in to your account.</p>

      {error ? (
        <p className="mt-6 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-600">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
            aria-hidden="true"
          />
          Loading orders…
        </div>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-700">You do not have any orders yet.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Continue shopping
          </Link>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm text-slate-800">
            <caption className="sr-only">Your orders</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th scope="col" className="px-4 py-3">
                  Order
                </th>
                <th scope="col" className="px-4 py-3">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="align-top px-4 py-3 font-mono text-xs text-slate-900">{o.orderNumber}</td>
                  <td className="align-top px-4 py-3 text-slate-700">
                    {new Date(o.placedAt).toLocaleString('en-AU', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="align-top px-4 py-3 text-right tabular-nums text-slate-900">
                    {o.currencyCode === 'AUD'
                      ? `A$${formatAudAmount(Number(o.grandTotal))}`
                      : `${o.currencyCode} ${o.grandTotal}`}
                  </td>
                  <td className="hidden align-top px-4 py-3 text-slate-600 md:table-cell">
                    <span className="text-xs">{formatOrderLabels(o.status, o.paymentStatus)}</span>
                  </td>
                  <td className="align-top px-4 py-3 text-right">
                    <Link
                      to={`/orders/${o.id}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-sky-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
