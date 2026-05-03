import { FiImage, FiRefreshCw } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { publicProductDetailPath } from '../categoryProductRoutes'
import type { RelatedProductItem } from './types'

type PublicProductRelatedSectionProps = {
  relatedProducts: RelatedProductItem[]
  isRelatedLoading: boolean
  decodedLevel1: string
  decodedCategorySlug: string
  detailSearchSuffix: string
}

export function PublicProductRelatedSection({
  relatedProducts,
  isRelatedLoading,
  decodedLevel1,
  decodedCategorySlug,
  detailSearchSuffix,
}: PublicProductRelatedSectionProps) {
  return (
    <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="related-products-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="related-products-heading" className="text-lg font-semibold text-slate-900">
          More in this category
        </h3>
        {isRelatedLoading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-busy="true">
            <FiRefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden="true" />
            Loading…
          </span>
        ) : null}
      </div>
      {!isRelatedLoading && relatedProducts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No other products in this category yet.</p>
      ) : null}
      {relatedProducts.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {relatedProducts.map((item) => (
            <li key={item.id} className="min-w-0">
              <NavLink
                to={`${publicProductDetailPath(decodedLevel1, decodedCategorySlug, item.sku)}${detailSearchSuffix}`}
                className={({ isPending }) =>
                  `flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isPending ? 'opacity-80' : 'hover:border-slate-300 hover:shadow'
                  }`
                }
              >
                {({ isPending }) => (
                  <>
                    <div className="relative aspect-[5/3] w-full bg-slate-100">
                      {isPending ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                          <FiRefreshCw className="h-6 w-6 animate-spin text-sky-600" aria-hidden="true" />
                        </div>
                      ) : null}
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <FiImage className="h-8 w-8" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">{item.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">{item.sku}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        A${Number(item.basePrice).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
