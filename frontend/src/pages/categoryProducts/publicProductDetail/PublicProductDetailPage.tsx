import { useEffect, useMemo, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { PublicCategory } from '../../../components/navbar/types'
import {
  findPublicCategoryBySlugUnderLevel1,
  getPublicCategoryPathRootToLeaf,
} from '../../../components/navbar/categoryTree'
import { categoryProductsPath, publicProductDetailPath } from '../categoryProductRoutes'
import { PublicProductDetailArticle } from './PublicProductDetailArticle'
import { PublicProductDetailBreadcrumb } from './PublicProductDetailBreadcrumb'
import { PublicProductRelatedSection } from './PublicProductRelatedSection'
import { readJsonResponse, safeDecode, uuidPattern } from './productDetailUtils'
import type { PublicProductDetail, RelatedProductItem } from './types'

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
  const [relatedProducts, setRelatedProducts] = useState<RelatedProductItem[]>([])
  const [isRelatedLoading, setIsRelatedLoading] = useState(false)
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

  useEffect(() => {
    /** Same scope as category browse listing (slug + department), not the product's leaf category_id. */
    const scopeCategoryId = categoryMeta?.id
    if (!scopeCategoryId || !product?.id) {
      setRelatedProducts([])
      return
    }

    let isMounted = true
    const loadRelated = async () => {
      setIsRelatedLoading(true)
      try {
        const qs = new URLSearchParams({
          categoryId: scopeCategoryId,
          excludeProductId: product.id,
          take: '8',
        })
        let res = await fetch(`${apiBaseUrl}/api/products/public/related?${qs.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) {
          res = await fetch(`/api/products/public/related?${qs.toString()}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (!res.ok || !isMounted) return
        const payload = await readJsonResponse<{ items?: RelatedProductItem[] }>(res)
        setRelatedProducts(payload.items ?? [])
      } catch {
        if (isMounted) setRelatedProducts([])
      } finally {
        if (isMounted) setIsRelatedLoading(false)
      }
    }

    void loadRelated()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, categoryMeta?.id, product?.id])

  const listBackHref = useMemo(() => {
    const base = categoryProductsPath(decodedLevel1, decodedCategorySlug)
    if (!searchKeyword) return base
    return `${base}?${new URLSearchParams({ q: searchKeyword }).toString()}`
  }, [decodedCategorySlug, decodedLevel1, searchKeyword])

  const pageTitle = product?.name ?? 'Product'

  const detailSearchSuffix =
    searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''

  return (
    <div className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
      <div className="mx-auto w-full max-w-7xl py-6 md:py-8">
        <h1 className="sr-only">{pageTitle}</h1>
        <PublicProductDetailBreadcrumb
          breadcrumbChain={breadcrumbChain}
          decodedLevel1={decodedLevel1}
          searchKeyword={searchKeyword}
          productName={product?.name ?? null}
        />

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

        {!error && !isLoading && product ? <PublicProductDetailArticle product={product} /> : null}

        {!error && !isLoading && product && categoryMeta?.id ? (
          <PublicProductRelatedSection
            relatedProducts={relatedProducts}
            isRelatedLoading={isRelatedLoading}
            decodedLevel1={decodedLevel1}
            decodedCategorySlug={decodedCategorySlug}
            detailSearchSuffix={detailSearchSuffix}
          />
        ) : null}
      </div>
    </div>
  )
}
