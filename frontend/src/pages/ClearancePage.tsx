import { useEffect, useState } from 'react'
import { HomeProductCard, type HomeProductCardModel } from '../components/home/HomeProductCard'

type SpotlightResponse = {
  items?: HomeProductCardModel[]
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load data (server returned a non-JSON page). Run the API and ensure /api is reachable.',
    )
  }
  return (await response.json()) as T
}

async function fetchClearanceProducts(): Promise<HomeProductCardModel[]> {
  const path = '/api/products/public/clearance?take=200'
  let res = await fetch(`${apiBaseUrl}${path}`)
  if (!res.ok) {
    res = await fetch(path)
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}).`)
  }
  const data = await readJsonResponse<SpotlightResponse>(res)
  return data.items ?? []
}

export default function ClearancePage() {
  const [items, setItems] = useState<HomeProductCardModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const list = await fetchClearanceProducts()
        if (!alive) return
        setItems(list)
        setError(null)
      } catch (e) {
        if (!alive) return
        setItems([])
        setError(e instanceof Error ? e.message : 'Unable to load clearance products.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90">
      <div className="mx-auto min-w-0 w-full max-w-[min(100%,120rem)] px-4 pb-12 pt-6 md:px-6 md:pb-16 md:pt-8 xl:px-8">
        <div className="mx-auto min-w-0 w-full max-w-7xl">
          <header className="border-b border-slate-200/80 pb-6 md:pb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Clearance</h1>
            <p className="mt-2 max-w-7xl text-sm leading-relaxed text-slate-600 md:text-base">
              Strong prices on clearance items while stock lasts. Selection updates as new deals are added.
            </p>
          </header>

          {error ? (
            <p
              className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[280px] animate-pulse rounded-xl border border-slate-200/90 bg-slate-100/80"
                />
              ))}
            </div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-600 md:text-base">No clearance products right now.</p>
          ) : null}

          {!loading && items.length > 0 ? (
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li key={p.id} className="min-w-0">
                  <HomeProductCard product={p} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
