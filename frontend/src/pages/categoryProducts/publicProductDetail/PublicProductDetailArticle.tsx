import { FiImage, FiPackage, FiShoppingBag } from 'react-icons/fi'
import type { PublicProductDetail } from './types'
import { ProductDescriptionBulletList } from './ProductDescriptionBulletList'

/** Australian grouping (e.g. 3,268.00). */
function formatAudAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

type PublicProductDetailArticleProps = {
  product: PublicProductDetail
}

export function PublicProductDetailArticle({ product }: PublicProductDetailArticleProps) {
  const availableQty = Number(product.availableQuantity ?? 0)

  return (
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
          <div className="flex items-start gap-2">
            <FiPackage className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU: <span className="mt-1 font-mono text-sm text-slate-700">{product.sku}</span></p>

            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{product.name}</h2>
          <p className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <FiShoppingBag className="h-6 w-6 shrink-0 text-sky-600 sm:h-7 sm:w-7" aria-hidden="true" />
            <span>{`A$${formatAudAmount(Number(product.basePrice))}`}</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {availableQty > 0 ? (
              <>
                In stock:{' '}
                <span className="font-semibold tabular-nums text-emerald-700">{availableQty}</span>
                <span className="text-slate-500"> — you can buy more than one while supplies last.</span>
              </>
            ) : (
              <span className="text-amber-800">Out of stock</span>
            )}
          </p>
          {/* {product.categoryName ? (
            <p className="mt-2 inline-flex items-start gap-2 text-sm text-slate-600">
              <FiLayers className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span>{product.categoryName}</span>
            </p>
          ) : null} */}
          {product.description?.trim() ? (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Description:
              </p>
              <ProductDescriptionBulletList text={product.description} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
