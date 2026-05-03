import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import type { PublicCategory } from '../../components/navbar/types'
import { getLevel1SlugForCategory } from '../../components/navbar/categoryTree'
import { categoryProductsPath } from './categoryProductRoutes'

/** Redirects `/shop/{slug}/products` to `/{level1Slug}/{slug}/products`. */
export function LegacyShopSlugRedirect() {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>()
  const [target, setTarget] = useState<string | 'missing' | null>(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const slug = (() => {
        try {
          return decodeURIComponent(categorySlug).trim()
        } catch {
          return categorySlug.trim()
        }
      })()
      if (!slug) {
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
        const items = payload.items ?? []
        const cat = items.find((c) => c.slug.toLowerCase() === slug.toLowerCase())
        if (!mounted) return
        if (!cat) {
          setTarget('missing')
          return
        }
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
  }, [apiBaseUrl, categorySlug])

  if (target === null) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
        <div className="mx-auto w-full max-w-7xl py-6 md:py-8">
          <p className="text-sm text-slate-500">Updating to the new link…</p>
        </div>
      </div>
    )
  }

  if (target === 'missing') {
    return <Navigate to="/" replace />
  }

  return <Navigate to={target} replace />
}
