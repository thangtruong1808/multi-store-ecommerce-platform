import { FiImage } from 'react-icons/fi'
import { NavLink } from 'react-router-dom'
import { publicProductDetailPath } from '../../pages/categoryProducts/categoryProductRoutes'
import { formatAudAmount } from './formatAud'

export type HomeProductCardModel = {
  id: string
  sku: string
  name: string
  basePrice: number
  categoryName?: string | null
  level1Slug?: string | null
  categorySlug?: string | null
}

type HomeProductCardProps = {
  product: HomeProductCardModel
}

export function HomeProductCard({ product }: HomeProductCardProps) {
  const l1 = product.level1Slug?.trim()
  const cat = product.categorySlug?.trim()
  const hasPath = Boolean(l1 && cat)
  const to = hasPath ? publicProductDetailPath(l1!, cat!, product.sku) : '#'

  const cardBody = (
    <>
      <div className="relative aspect-[5/3] w-full shrink-0 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
          <FiImage className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">Photo soon</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <p className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-sky-900">{product.name}</p>
        <p className="mt-2 font-mono text-xs text-slate-500">SKU {product.sku}</p>
        <p className="mt-3 tabular-nums text-lg font-bold tracking-tight text-slate-900">{`A$${formatAudAmount(Number(product.basePrice))}`}</p>
        {product.categoryName ? (
          <p className="mt-2 line-clamp-1 text-xs text-slate-500">{product.categoryName}</p>
        ) : null}
      </div>
    </>
  )

  if (!hasPath) {
    return (
      <div className="flex h-full min-h-[280px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white opacity-80 shadow-sm">
        {cardBody}
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isPending }) =>
        `group flex h-full min-h-[280px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm outline-none ring-sky-500/40 transition duration-200 focus-visible:ring-2 ${
          isPending
            ? 'pointer-events-none border-sky-200 opacity-90'
            : 'hover:-translate-y-0.5 hover:border-sky-200/80 hover:shadow-lg active:translate-y-0'
        }`
      }
      aria-label={`View ${product.name}`}
    >
      {cardBody}
    </NavLink>
  )
}
