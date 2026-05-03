import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import type { PublicCategory } from '../../components/navbar/types'
import { getLevel1SlugForCategory } from '../../components/navbar/categoryTree'
import { categoryProductsPath } from './categoryProductRoutes'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Redirects old `/shop/categories/level-x/:id/products` URLs to `/{level1Slug}/{slug}/products`. */
export function LegacyShopCategoryRedirect() {
  const { categoryId = '' } = useParams<{ categoryId: string }>()
  const [target, setTarget] = useState<string | 'missing' | null>(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!uuidPattern.test(categoryId)) {
        setTarget('missing')
        return
      }
      try {
        let response = await fetch(`${apiBaseUrl}/api/categories/public`)
        if (!response.ok) {
          response = await fetch('/api/categories/public')
        }
        if (!response.ok) {
          if (mounted) setTarget('missing')
          return
        }
        const payload = (await response.json()) as { items?: PublicCategory[] }
        const cat = payload.items?.find((c) => c.id === categoryId)
        if (!mounted) return
        if (!cat?.slug) {
          setTarget('missing')
          return
        }
        const items = payload.items ?? []
        const l1 = getLevel1SlugForCategory(items, cat.id)
        if (!l1) {
          setTarget('missing')
          return
        }
        setTarget(categoryProductsPath(l1, cat.slug))
      } catch {
        if (mounted) setTarget('missing')
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [apiBaseUrl, categoryId])

  if (target === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-slate-500">Updating to the new product link…</p>
      </div>
    )
  }

  if (target === 'missing') {
    return <Navigate to="/" replace />
  }

  return <Navigate to={target} replace />
}
