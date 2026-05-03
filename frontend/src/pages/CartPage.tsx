import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchEligibleStores } from '../features/checkout/checkoutEligibility'
import { createCheckoutSession } from '../features/checkout/checkoutThunks'
import { removeLine, setLineQuantity } from '../features/cart/cartSlice'
import { formatAudAmount } from '../components/home/formatAud'

export default function CartPage() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const [eligibleStores, setEligibleStores] = useState<{ id: string; name: string }[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  const cartSignature = useMemo(
    () => items.map((i) => `${i.productId}:${i.quantity}`).join('|'),
    [items],
  )

  useEffect(() => {
    if (!isAuthenticated || items.length === 0) {
      setEligibleStores([])
      setSelectedStoreId(null)
      setEligibilityError(null)
      setEligibilityLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setEligibilityLoading(true)
      setEligibilityError(null)
      try {
        const stores = await fetchEligibleStores(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )
        if (cancelled) {
          return
        }
        setEligibleStores(stores)
        if (stores.length === 1) {
          setSelectedStoreId(stores[0].id)
        } else if (stores.length === 0) {
          setSelectedStoreId(null)
        } else {
          setSelectedStoreId((prev) =>
            prev && stores.some((s) => s.id === prev) ? prev : null,
          )
        }
      } catch (e) {
        if (!cancelled) {
          setEligibleStores([])
          setSelectedStoreId(null)
          setEligibilityError(e instanceof Error ? e.message : 'Unable to load stores.')
        }
      } finally {
        if (!cancelled) {
          setEligibilityLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, cartSignature])

  const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  const canAttemptCheckout =
    isAuthenticated &&
    items.length > 0 &&
    !eligibilityLoading &&
    eligibleStores.length > 0 &&
    Boolean(selectedStoreId)

  const handleCheckout = async () => {
    setCheckoutError(null)
    if (!isAuthenticated) {
      setCheckoutError('Please sign in to pay with card.')
      return
    }
    if (!selectedStoreId) {
      setCheckoutError('Choose a store to fulfil your order.')
      return
    }
    setIsCheckingOut(true)
    const result = await dispatch(createCheckoutSession(selectedStoreId))
    setIsCheckingOut(false)
    if (createCheckoutSession.fulfilled.match(result)) {
      window.location.assign(result.payload)
      return
    }
    setCheckoutError(typeof result.payload === 'string' ? result.payload : 'Checkout failed.')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Shopping cart</h1>
      <p className="mt-2 text-sm text-slate-600">
        Review your items and continue to secure checkout (Stripe test mode on the server).
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-700">Your cart is empty.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {items.map((line) => (
              <li key={line.productId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{line.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">SKU {line.sku}</p>
                  <p className="mt-2 tabular-nums text-sm text-slate-700">{`A$${formatAudAmount(line.unitPrice)} each`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="sr-only">Quantity</span>
                    <input
                      type="number"
                      min={1}
                      className="w-20 rounded-md border border-slate-200 px-2 py-2 text-sm tabular-nums"
                      value={line.quantity}
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10)
                        if (!Number.isFinite(v)) {
                          return
                        }
                        dispatch(setLineQuantity({ productId: line.productId, quantity: v }))
                      }}
                      aria-label={`Quantity for ${line.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                    onClick={() => dispatch(removeLine(line.productId))}
                  >
                    Remove
                  </button>
                  <p className="min-w-[6rem] text-right text-sm font-semibold tabular-nums text-slate-900">
                    {`A$${formatAudAmount(line.unitPrice * line.quantity)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {isAuthenticated && items.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <fieldset>
                <legend className="text-sm font-medium text-slate-800">Fulfil from store</legend>
                <p className="mt-1 text-xs text-slate-500">
                  Stock is reserved per store. Choose where your order should be fulfilled.
                </p>

                {eligibilityLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <span
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
                      aria-hidden="true"
                    />
                    Checking store availability…
                  </div>
                ) : null}

                {eligibilityError ? (
                  <p className="mt-4 text-sm text-rose-600" role="alert">
                    {eligibilityError}
                  </p>
                ) : null}

                {!eligibilityLoading && !eligibilityError && eligibleStores.length === 0 ? (
                  <p className="mt-4 text-sm text-amber-800" role="status">
                    No store can fulfil this cart with current quantities. Try reducing quantities or remove items.
                  </p>
                ) : null}

                {!eligibilityLoading && eligibleStores.length === 1 ? (
                  <p className="mt-4 text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{eligibleStores[0].name}</span>
                    <span className="text-slate-500"> — has stock for your cart.</span>
                  </p>
                ) : null}

                {!eligibilityLoading && eligibleStores.length > 1 ? (
                  <div className="mt-4 flex flex-col gap-3">
                    {eligibleStores.map((store) => (
                      <label
                        key={store.id}
                        className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-500"
                      >
                        <input
                          type="radio"
                          name="fulfilment-store"
                          value={store.id}
                          checked={selectedStoreId === store.id}
                          onChange={() => setSelectedStoreId(store.id)}
                          className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-sm font-medium text-slate-900">{store.name}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </fieldset>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold text-slate-900">
              Subtotal{' '}
              <span className="tabular-nums">{`A$${formatAudAmount(subtotal)}`}</span>
            </p>
            <button
              type="button"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              disabled={isCheckingOut || !canAttemptCheckout}
              onClick={() => void handleCheckout()}
            >
              {isCheckingOut ? 'Redirecting…' : 'Pay with card (test)'}
            </button>
          </div>

          {checkoutError ? (
            <p className="text-sm text-rose-600" role="alert">
              {checkoutError}{' '}
              {!isAuthenticated ? (
                <Link to="/signin" className="font-medium underline underline-offset-2">
                  Sign in
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
