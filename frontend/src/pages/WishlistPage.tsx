import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { API_BASE_URL } from '../features/auth/authConstants'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { removeWishlistOnServer } from '../features/wishlist/wishlistThunks'
import { removeWishlistProduct } from '../features/wishlist/wishlistSlice'
import { formatAudAmount } from '../components/home/formatAud'
import { publicProductDetailPath } from './categoryProducts/categoryProductRoutes'
import type { PublicProductDetail } from './categoryProducts/publicProductDetail/types'

type RowState =
  | { status: 'loading'; id: string }
  | { status: 'ok'; id: string; product: PublicProductDetail }
  | { status: 'missing'; id: string }

export default function WishlistPage() {
  const dispatch = useAppDispatch()
  const ids = useAppSelector((s) => s.wishlist.ids)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [rows, setRows] = useState<RowState[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setRows(ids.map((id) => ({ status: 'loading', id })))
      const next: RowState[] = []
      for (const id of ids) {
        try {
          let response = await fetch(`${API_BASE_URL}/api/products/public/${encodeURIComponent(id)}`)
          if (!response.ok) {
            response = await fetch(`/api/products/public/${encodeURIComponent(id)}`)
          }
          if (!response.ok) {
            next.push({ status: 'missing', id })
            continue
          }
          const product = (await response.json()) as PublicProductDetail
          next.push({ status: 'ok', id, product })
        } catch {
          next.push({ status: 'missing', id })
        }
      }
      if (!cancelled) {
        setRows(next)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [ids])

  const remove = (id: string) => {
    dispatch(removeWishlistProduct(id))
    if (isAuthenticated) {
      void dispatch(removeWishlistOnServer(id))
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Wishlist</h1>
      <p className="mt-2 text-sm text-slate-600">
        Saved products stay on this device; sign in to sync your list across sessions.
      </p>

      {ids.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-slate-700">Your wishlist is empty.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => {
            if (row.status === 'loading') {
              return (
                <li key={row.id} className="p-4 text-sm text-slate-500">
                  Loading…
                </li>
              )
            }
            if (row.status === 'missing') {
              return (
                <li key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-amber-800">Product no longer available ({row.id.slice(0, 8)}…).</span>
                  <button
                    type="button"
                    className="min-h-[44px] self-start rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => remove(row.id)}
                  >
                    Remove
                  </button>
                </li>
              )
            }
            const p = row.product
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">SKU {p.sku}</p>
                  <p className="mt-2 tabular-nums text-slate-900">{`A$${formatAudAmount(Number(p.basePrice))}`}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ProductLink product={p} />
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => remove(row.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProductLink({ product }: { product: PublicProductDetail }) {
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!product.categoryId) {
        setHref(null)
        return
      }
      try {
        let r = await fetch(`${API_BASE_URL}/api/categories/public`)
        if (!r.ok) {
          r = await fetch('/api/categories/public')
        }
        if (!r.ok) {
          setHref(null)
          return
        }
        const data = (await r.json()) as {
          items?: { id: string; slug: string; level: number; parentId?: string | null }[]
        }
        const items = data.items ?? []
        const byId = new Map(items.map((c) => [c.id, c]))
        const leaf = byId.get(product.categoryId)
        let walker = leaf
        while (walker && walker.level > 1) {
          walker = walker.parentId ? byId.get(walker.parentId) : undefined
        }
        const level1Slug = walker?.level === 1 ? walker.slug : null
        const categorySlug = leaf?.slug
        if (level1Slug && categorySlug) {
          const path = publicProductDetailPath(level1Slug, categorySlug, product.sku)
          if (!cancelled) {
            setHref(path)
          }
          return
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setHref(null)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [product.categoryId, product.sku])

  if (!href) {
    return (
      <span className="text-xs text-slate-400" aria-hidden="true">
        Detail link unavailable
      </span>
    )
  }

  return (
    <Link
      to={href}
      className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      View product
    </Link>
  )
}
