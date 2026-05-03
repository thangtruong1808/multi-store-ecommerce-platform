import { useState } from 'react'
import { FiHeart, FiImage, FiPackage, FiShoppingBag, FiShoppingCart } from 'react-icons/fi'

import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { formatAudAmount } from '../../../components/home/formatAud'
import { addToCart } from '../../../features/cart/cartSlice'
import { addWishlistOnServer, removeWishlistOnServer } from '../../../features/wishlist/wishlistThunks'
import { toggleWishlistProduct } from '../../../features/wishlist/wishlistSlice'
import type { PublicProductDetail } from './types'
import { ProductDescriptionBulletList } from './ProductDescriptionBulletList'

type PublicProductDetailArticleProps = {
  product: PublicProductDetail
}

export function PublicProductDetailArticle({ product }: PublicProductDetailArticleProps) {
  const dispatch = useAppDispatch()
  const availableQty = Number(product.availableQuantity ?? 0)
  const inWishlist = useAppSelector((s) => s.wishlist.ids.includes(product.id))
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [announce, setAnnounce] = useState<string | null>(null)

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        product: {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: Number(product.basePrice),
        },
        quantity: 1,
        maxQuantity: availableQty > 0 ? availableQty : undefined,
      }),
    )
    setAnnounce('Added to cart')
    window.setTimeout(() => setAnnounce(null), 2500)
  }

  const handleWishlist = () => {
    const willRemove = inWishlist
    dispatch(toggleWishlistProduct(product.id))
    if (isAuthenticated) {
      if (willRemove) {
        void dispatch(removeWishlistOnServer(product.id))
      } else {
        void dispatch(addWishlistOnServer(product.id))
      }
    }
    setAnnounce(willRemove ? 'Removed from wishlist' : 'Saved to wishlist')
    window.setTimeout(() => setAnnounce(null), 2500)
  }

  return (
    <article className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div aria-live="polite" className="sr-only">
        {announce ?? ''}
      </div>
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
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                SKU: <span className="mt-1 font-mono text-sm text-slate-700">{product.sku}</span>
              </p>
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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={availableQty <= 0}
              onClick={handleAddToCart}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
              Add to cart
            </button>
            <button
              type="button"
              onClick={handleWishlist}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                inWishlist
                  ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'
                  : 'border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
              aria-pressed={inWishlist}
            >
              <FiHeart className="h-4 w-4 shrink-0" aria-hidden="true" />
              {inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            </button>
          </div>

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
