import { Link } from 'react-router-dom'

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Checkout cancelled</h1>
        <p className="mt-3 text-sm text-slate-600">No charge was made. You can return to the cart to try again.</p>
        <Link
          to="/cart"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Return to cart
        </Link>
      </div>
    </div>
  )
}
