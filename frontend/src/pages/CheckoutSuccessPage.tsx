import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAppDispatch } from '../app/hooks'
import { clearCart } from '../features/cart/cartSlice'

export default function CheckoutSuccessPage() {
  const dispatch = useAppDispatch()
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  useEffect(() => {
    if (sessionId) {
      dispatch(clearCart())
    }
  }, [dispatch, sessionId])

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-6">
      <div className="rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Payment successful</h1>
        <p className="mt-3 text-sm text-slate-600">
          Thank you. Your order is recorded and stock will be adjusted when Stripe confirms the payment (webhook).
        </p>
        {sessionId ? (
          <p className="mt-4 font-mono text-xs text-slate-500">
            Checkout session: <span className="break-all">{sessionId}</span>
          </p>
        ) : null}
        <Link
          to="/"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
