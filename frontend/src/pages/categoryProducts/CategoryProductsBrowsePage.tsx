import { useEffect, useMemo, useState } from 'react'
import { FiChevronRight, FiImage, FiRefreshCw } from 'react-icons/fi'
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { PublicCategory } from '../../components/navbar/types'
import {
  categoryBelongsUnderLevel1Slug,
  findPublicCategoryBySlugUnderLevel1,
  getLevel1SlugForCategory,
  getPublicCategoryPathRootToLeaf,
} from '../../components/navbar/categoryTree'
import { categoryProductsPath, publicProductDetailPath } from './categoryProductRoutes'

type PublicProduct = {
  id: string
  name: string
  sku: string
  basePrice: number
  categoryName?: string | null
  description?: string | null
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

/** Avoids parsing Vite's index.html as JSON when /api is not proxied. */
async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load catalog data (server returned a non-JSON page). Run the API on port 5080 and restart the dev server so /api is proxied.',
    )
  }
  return (await response.json()) as T
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function CategoryProductsBySlugPage() {
  const { level1Slug = '', categorySlug = '' } = useParams<{ level1Slug: string; categorySlug: string }>()
  const [searchParams] = useSearchParams()
  const searchKeyword = searchParams.get('q')?.trim() ?? ''
  const navigate = useNavigate()

  const decodedLevel1 = useMemo(() => safeDecode(level1Slug), [level1Slug])
  const decodedCategorySlug = useMemo(() => safeDecode(categorySlug), [categorySlug])
  const legacyCategoryIdParam = searchParams.get('categoryId')?.trim() ?? ''

  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

  const categoryMeta = useMemo(() => {
    if (!decodedCategorySlug) return null
    return findPublicCategoryBySlugUnderLevel1(categories, decodedCategorySlug, decodedLevel1) ?? null
  }, [categories, decodedCategorySlug, decodedLevel1])

  const breadcrumbChain = useMemo(() => {
    if (!categoryMeta) return []
    return getPublicCategoryPathRootToLeaf(categories, categoryMeta)
  }, [categories, categoryMeta])

  useEffect(() => {
    if (!decodedLevel1 || !decodedCategorySlug) {
      setCategories([])
      setProducts([])
      setIsLoading(false)
      setError('Invalid category link.')
      return
    }

    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let categoriesResponse = await fetch(`${apiBaseUrl}/api/categories/public`)
        if (!categoriesResponse.ok) {
          categoriesResponse = await fetch('/api/categories/public')
        }
        if (!categoriesResponse.ok) throw new Error('Unable to load categories.')
        const categoriesPayload = await readJsonResponse<{ items?: PublicCategory[] }>(categoriesResponse)
        const items = categoriesPayload.items ?? []
        if (!isMounted) return
        setCategories(items)

        if (legacyCategoryIdParam && uuidPattern.test(legacyCategoryIdParam)) {
          const legacyCat = items.find((c) => c.id === legacyCategoryIdParam)
          if (legacyCat) {
            const l1 = getLevel1SlugForCategory(items, legacyCat.id)
            if (l1) {
              const sp = new URLSearchParams()
              if (searchKeyword) sp.set('q', searchKeyword)
              const qs = sp.toString()
              navigate(`${categoryProductsPath(l1, legacyCat.slug)}${qs ? `?${qs}` : ''}`, { replace: true })
              return
            }
          }
        }

        const cat = findPublicCategoryBySlugUnderLevel1(items, decodedCategorySlug, decodedLevel1)

        if (!cat) {
          setProducts([])
          setError('Category not found.')
          setIsLoading(false)
          return
        }

        if (!categoryBelongsUnderLevel1Slug(items, cat.id, decodedLevel1)) {
          const correctL1 = getLevel1SlugForCategory(items, cat.id)
          if (correctL1) {
            navigate(categoryProductsPath(correctL1, cat.slug), { replace: true })
            return
          }
          setProducts([])
          setError('This product category does not belong under that department link.')
          setIsLoading(false)
          return
        }

        const query = new URLSearchParams()
        if (searchKeyword) query.set('q', searchKeyword)
        query.set('level1Slug', decodedLevel1)
        const slugSegment = encodeURIComponent(decodedCategorySlug)

        let url = `${apiBaseUrl}/api/products/public/category/${slugSegment}?${query.toString()}`
        let productsResponse = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!productsResponse.ok) {
          url = `/api/products/public/category/${slugSegment}?${query.toString()}`
          productsResponse = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (productsResponse.status === 404) {
          if (!isMounted) return
          setProducts([])
          setError('Category not found.')
          setIsLoading(false)
          return
        }

        if (productsResponse.status === 400) {
          let body: { message?: string } | null = null
          try {
            body = await readJsonResponse<{ message?: string }>(productsResponse)
          } catch {
            body = null
          }
          if (!isMounted) return
          setProducts([])
          setError(body?.message ?? 'This category cannot be used for this listing.')
          setIsLoading(false)
          return
        }

        if (!productsResponse.ok) {
          throw new Error(`Unable to load products (${productsResponse.status}).`)
        }

        const productsPayload = await readJsonResponse<{ items?: PublicProduct[] }>(productsResponse)
        if (!isMounted) return
        setProducts(productsPayload.items ?? [])
      } catch (e) {
        if (!isMounted) return
        setProducts([])
        setError(e instanceof Error ? e.message : 'Unable to load products.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, decodedCategorySlug, decodedLevel1, legacyCategoryIdParam, navigate, searchKeyword])

  const pageTitle = categoryMeta?.name ?? (decodedCategorySlug || 'Category')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <h1 className="sr-only">
        {searchKeyword ? `${pageTitle} — search: ${searchKeyword}` : pageTitle}
      </h1>
      <nav className="text-xs text-slate-500 sm:text-sm" aria-label="Breadcrumb" aria-busy={isLoading && breadcrumbChain.length === 0}>
        <ol className="flex max-w-full flex-wrap items-center gap-x-1 gap-y-1.5 sm:gap-x-1.5">
          <li className="flex min-w-0 shrink-0 items-center">
            <Link
              to="/"
              className="rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
            >
              Home
            </Link>
          </li>
          {isLoading && breadcrumbChain.length === 0 && !error ? (
            <li className="flex min-w-0 items-center gap-1">
              <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 text-slate-500" aria-busy="true">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading category path</span>
                <span aria-hidden="true">Loading…</span>
              </span>
            </li>
          ) : null}
          {breadcrumbChain.map((cat, index) => {
            const isLast = index === breadcrumbChain.length - 1
            const searchSuffix =
              searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''
            const segmentHref = `${categoryProductsPath(decodedLevel1, cat.slug)}${searchSuffix}`
            return (
              <li key={cat.id} className="flex min-w-0 max-w-full items-center gap-1">
                <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                {isLast ? (
                  <span
                    className="min-w-0 truncate font-medium text-slate-800"
                    title={cat.name}
                    aria-current="page"
                  >
                    {cat.name}
                  </span>
                ) : (
                  <Link
                    to={segmentHref}
                    className="min-w-0 truncate rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
                    title={cat.name}
                  >
                    {cat.name}
                  </Link>
                )}
              </li>
            )
          })}
          {!isLoading && error && breadcrumbChain.length === 0 && decodedCategorySlug ? (
            <li className="flex min-w-0 items-center gap-1">
              <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 truncate text-slate-600" title={decodedCategorySlug}>
                {decodedCategorySlug}
              </span>
            </li>
          ) : null}
        </ol>
      </nav>

      {error ? (
        <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {!error && isLoading ? (
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500" aria-busy="true" role="status">
          <FiRefreshCw className="h-4 w-4 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
          <span className="sr-only">Fetching products from server</span>
          <span aria-hidden="true">Loading products…</span>
        </p>
      ) : null}

      {!error && !isLoading && products.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No active products found for this category.</p>
      ) : null}

      {!error && !isLoading && products.length > 0 ? (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const detailSearch =
              searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''
            const detailTo = `${publicProductDetailPath(decodedLevel1, decodedCategorySlug, product.sku)}${detailSearch}`
            const rawDesc = product.description?.trim()
            const excerpt = rawDesc
              ? rawDesc.length > 120
                ? `${rawDesc.slice(0, 120)}…`
                : rawDesc
              : product.categoryName
                ? `In ${product.categoryName}`
                : null

            return (
              <li key={product.id} className="h-full min-w-0">
                <NavLink
                  to={detailTo}
                  className={({ isPending }) =>
                    `group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                      isPending ? 'pointer-events-none border-sky-200 opacity-90' : 'hover:border-slate-300 hover:shadow-md'
                    }`
                  }
                  aria-label={`View ${product.name}`}
                >
                  {({ isPending }) => (
                    <>
                      <div className="relative aspect-[4/3] w-full shrink-0 bg-slate-100">
                        {isPending ? (
                          <div
                            className="absolute inset-0 z-10 flex items-center justify-center bg-white/70"
                            aria-busy="true"
                            role="status"
                          >
                            <FiRefreshCw className="h-8 w-8 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
                            <span className="sr-only">Opening product</span>
                          </div>
                        ) : null}
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
                          <FiImage className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />
                          <span className="sr-only">No product photo</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                            Photo soon
                          </span>
                        </div>
                      </div>
                      <article className="flex min-h-0 flex-1 flex-col p-4">
                        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-sky-900">
                          {product.name}
                        </h2>
                        <p className="mt-2 font-mono text-xs text-slate-600">SKU {product.sku}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          A${Number(product.basePrice).toFixed(2)}
                        </p>
                        {product.categoryName ? (
                          <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
                        ) : null}
                        {excerpt ? (
                          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{excerpt}</p>
                        ) : null}
                      </article>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
