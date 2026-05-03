import { useEffect, useMemo, useState } from 'react'
import { FiChevronRight, FiImage, FiRefreshCw } from 'react-icons/fi'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { PublicCategory } from '../../components/navbar/types'
import {
  findPublicCategoryBySlugUnderLevel1,
  getPublicCategoryPathRootToLeaf,
} from '../../components/navbar/categoryTree'
import { categoryProductsPath, publicProductDetailPath } from './categoryProductRoutes'

type PublicProductDetail = {
  id: string
  sku: string
  name: string
  description: string | null
  basePrice: number
  categoryName?: string | null
  imageS3Keys: string[]
  videoUrls: string[]
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load product (server returned a non-JSON page). Run the API on port 5080 and restart the dev server so /api is proxied.',
    )
  }
  return (await response.json()) as T
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function PublicProductDetailPage() {
  const { level1Slug = '', categorySlug = '', productSku = '' } = useParams<{
    level1Slug: string
    categorySlug: string
    productSku: string
  }>()
  const [searchParams] = useSearchParams()
  const searchKeyword = searchParams.get('q')?.trim() ?? ''
  const navigate = useNavigate()

  const decodedLevel1 = useMemo(() => safeDecode(level1Slug), [level1Slug])
  const decodedCategorySlug = useMemo(() => safeDecode(categorySlug), [categorySlug])
  const decodedProductRef = useMemo(() => safeDecode(productSku), [productSku])

  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [product, setProduct] = useState<PublicProductDetail | null>(null)
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
    if (!decodedLevel1 || !decodedCategorySlug || !decodedProductRef) {
      setError('Invalid product link.')
      setIsLoading(false)
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

        const searchQs =
          searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''

        const loadById = uuidPattern.test(decodedProductRef)
        let productResponse: Response

        if (loadById) {
          const pid = encodeURIComponent(decodedProductRef)
          productResponse = await fetch(`${apiBaseUrl}/api/products/public/${pid}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          if (!productResponse.ok) {
            productResponse = await fetch(`/api/products/public/${pid}`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            })
          }
        } else {
          const skuSeg = encodeURIComponent(decodedProductRef)
          productResponse = await fetch(`${apiBaseUrl}/api/products/public/sku/${skuSeg}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          if (!productResponse.ok) {
            productResponse = await fetch(`/api/products/public/sku/${skuSeg}`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            })
          }
        }

        if (productResponse.status === 404) {
          if (!isMounted) return
          setProduct(null)
          setError('Product not found.')
          setIsLoading(false)
          return
        }

        if (!productResponse.ok) {
          throw new Error(`Unable to load product (${productResponse.status}).`)
        }

        const detail = await readJsonResponse<PublicProductDetail>(productResponse)
        if (!isMounted) return

        if (loadById && detail.sku?.trim()) {
          navigate(`${publicProductDetailPath(decodedLevel1, decodedCategorySlug, detail.sku)}${searchQs}`, {
            replace: true,
          })
          return
        }

        if (!loadById && detail.sku?.trim()) {
          const canonicalSkuSegment = detail.sku.trim().toLowerCase()
          if (decodedProductRef.trim() !== canonicalSkuSegment) {
            navigate(`${publicProductDetailPath(decodedLevel1, decodedCategorySlug, detail.sku)}${searchQs}`, {
              replace: true,
            })
            return
          }
        }

        setProduct({
          ...detail,
          imageS3Keys: Array.isArray(detail.imageS3Keys) ? detail.imageS3Keys : [],
          videoUrls: Array.isArray(detail.videoUrls) ? detail.videoUrls : [],
        })
      } catch (e) {
        if (!isMounted) return
        setProduct(null)
        setError(e instanceof Error ? e.message : 'Unable to load product.')
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
  }, [apiBaseUrl, decodedCategorySlug, decodedLevel1, decodedProductRef, navigate, searchKeyword])

  const listBackHref = useMemo(() => {
    const base = categoryProductsPath(decodedLevel1, decodedCategorySlug)
    if (!searchKeyword) return base
    return `${base}?${new URLSearchParams({ q: searchKeyword }).toString()}`
  }, [decodedCategorySlug, decodedLevel1, searchKeyword])

  const pageTitle = product?.name ?? 'Product'

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <h1 className="sr-only">{pageTitle}</h1>
      <nav className="text-xs text-slate-500 sm:text-sm" aria-label="Breadcrumb">
        <ol className="flex max-w-full flex-wrap items-center gap-x-1 gap-y-1.5 sm:gap-x-1.5">
          <li className="flex min-w-0 shrink-0 items-center">
            <Link
              to="/"
              className="rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
            >
              Home
            </Link>
          </li>
          {breadcrumbChain.map((cat) => {
            const searchSuffix =
              searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''
            const segmentHref = `${categoryProductsPath(decodedLevel1, cat.slug)}${searchSuffix}`
            return (
              <li key={cat.id} className="flex min-w-0 max-w-full items-center gap-1">
                <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <Link
                  to={segmentHref}
                  className="min-w-0 truncate rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
                  title={cat.name}
                >
                  {cat.name}
                </Link>
              </li>
            )
          })}
          {product ? (
            <li className="flex min-w-0 max-w-full items-center gap-1">
              <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 truncate font-medium text-slate-800" title={product.name} aria-current="page">
                {product.name}
              </span>
            </li>
          ) : null}
        </ol>
      </nav>

      <p className="mt-4">
        <Link
          to={listBackHref}
          className="inline-flex items-center gap-1 text-sm text-sky-700 underline-offset-4 hover:text-sky-800 hover:underline"
        >
          ← Back to category
        </Link>
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {!error && isLoading ? (
        <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500" aria-busy="true" role="status">
          <FiRefreshCw className="h-4 w-4 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
          <span className="sr-only">Fetching product from server</span>
          <span aria-hidden="true">Loading product…</span>
        </p>
      ) : null}

      {!error && !isLoading && product ? (
        <article className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full shrink-0 lg:max-w-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <FiImage className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden="true" />
                  <span className="px-4 text-center text-xs text-slate-500 sm:text-sm">Photo coming soon</span>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU</p>
              <p className="mt-1 font-mono text-sm text-slate-700">{product.sku}</p>
              <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{product.name}</h2>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                A${Number(product.basePrice).toFixed(2)}
              </p>
              {product.categoryName ? (
                <p className="mt-2 text-sm text-slate-600">{product.categoryName}</p>
              ) : null}
              {product.description?.trim() ? (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{product.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}
    </div>
  )
}
