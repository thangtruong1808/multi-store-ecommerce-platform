import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatAudAmount } from '../components/home/formatAud'
import {
  fetchCustomerOrder,
  type CustomerOrderDetail,
} from '../features/orders/customerOrdersApi'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setError('Missing order.')
      setLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await fetchCustomerOrder(orderId)
        if (!cancelled) {
          setOrder(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to load order.')
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
  }, [orderId])

  if (!orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <p className="text-sm text-rose-600">Invalid order link.</p>
        <Link to="/orders" className="mt-4 inline-block text-sm font-medium text-sky-700 underline">
          Back to order history
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order details</h1>
          {order ? (
            <p className="mt-1 font-mono text-sm text-slate-600">{order.orderNumber}</p>
          ) : null}
        </div>
        <Link
          to="/orders"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          All orders
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-600">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
            aria-hidden="true"
          />
          Loading…
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {order && !loading ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Placed</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(order.placedAt).toLocaleString('en-AU', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Total</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {order.currencyCode === 'AUD'
                    ? `A$${formatAudAmount(Number(order.grandTotal))}`
                    : `${order.currencyCode} ${order.grandTotal}`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Order status</dt>
                <dd className="font-medium capitalize text-slate-900">{order.status.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment</dt>
                <dd className="font-medium capitalize text-slate-900">{order.paymentStatus.replace(/_/g, ' ')}</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <caption className="sr-only">Line items</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Qty
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Line
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((line, idx) => (
                  <tr key={`${line.productName}-${idx}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">{line.productName}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-slate-600 sm:table-cell">
                      {line.sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{line.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {order.currencyCode === 'AUD'
                        ? `A$${formatAudAmount(Number(line.unitPrice))}`
                        : `${line.unitPrice}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                      {order.currencyCode === 'AUD'
                        ? `A$${formatAudAmount(Number(line.lineTotal))}`
                        : `${line.lineTotal}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
