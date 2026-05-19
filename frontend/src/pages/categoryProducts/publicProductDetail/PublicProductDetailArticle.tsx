import { useState } from 'react'
import { FiHeart, FiPackage, FiShoppingBag, FiShoppingCart } from 'react-icons/fi'

import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { formatAudAmount } from '../../../components/home/formatAud'
import { addToCart } from '../../../features/cart/cartSlice'
import { addWishlistOnServer, removeWishlistOnServer } from '../../../features/wishlist/wishlistThunks'
import { toggleWishlistProduct } from '../../../features/wishlist/wishlistSlice'
import type { PublicProductDetail } from './types'
import { ProductDescriptionBulletList } from './ProductDescriptionBulletList'
import { PublicProductDetailGallery } from './PublicProductDetailGallery'
import { useProductVoucherHints } from './useProductVoucherHints'

type PublicProductDetailArticleProps = {
  product: PublicProductDetail
}

export function PublicProductDetailArticle({ product }: PublicProductDetailArticleProps) {
  const dispatch = useAppDispatch()
  const availableQty = Number(product.availableQuantity ?? 0)
  const inWishlist = useAppSelector((s) => s.wishlist.ids.includes(product.id))
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [announce, setAnnounce] = useState<string | null>(null)
  const { hints: voucherHints, isLoading: isVoucherHintsLoading } = useProductVoucherHints(product.id)

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
        <PublicProductDetailGallery imageS3Keys={product.imageS3Keys} productName={product.name} />
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

          {isVoucherHintsLoading ? (
            <div
              className="mt-4 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-sm text-slate-600"
              role="status"
            >
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600"
                aria-hidden="true"
              />
              Checking voucher offers…
            </div>
          ) : voucherHints.length > 0 ? (
            <div
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
              role="status"
            >
              <p className="font-medium">Voucher available at other store locations</p>
              <ul className="mt-2 space-y-2">
                {voucherHints.map((hint) => (
                  <li key={hint.code}>
                    <span className="font-mono font-semibold">{hint.code}</span>
                    <span className="text-amber-900"> ({hint.label})</span>
                    <span className="block text-xs text-amber-800">
                      Valid at: {hint.storeNames.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-800">
                Select one of these stores at checkout to use the voucher.
              </p>
            </div>
          ) : null}

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
