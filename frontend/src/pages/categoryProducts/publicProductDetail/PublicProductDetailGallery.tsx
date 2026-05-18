import { useState } from 'react'

import { StorefrontProductPhoto } from '../../../components/product/StorefrontProductPhoto'
import { buildProductMediaUrl, getConfiguredProductMediaBaseUrl } from '../../../utils/productMediaUrl'
import { PublicProductDetailLightbox } from './PublicProductDetailLightbox'

type PublicProductDetailGalleryProps = {
  imageS3Keys: string[]
  productName: string
}

export function PublicProductDetailGallery({ imageS3Keys, productName }: PublicProductDetailGalleryProps) {
  const keys = imageS3Keys.map((k) => k.trim()).filter((k) => k.length > 0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const selectedKey = keys[selectedIndex] ?? null
  const baseUrl = getConfiguredProductMediaBaseUrl()
  const canOpenLightbox = Boolean(selectedKey && baseUrl)

  return (
    <div className="w-full shrink-0 lg:max-w-md">
      <div className="overflow-hidden rounded-lg">
        {canOpenLightbox ? (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="group relative block w-full cursor-zoom-in rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label={`View ${productName} photo ${selectedIndex + 1} full size`}
          >
            <StorefrontProductPhoto
              imageS3Key={selectedKey}
              alt={productName}
              aspectClassName="aspect-[4/3]"
              iconClassName="h-14 w-14 sm:h-16 sm:w-16"
              placeholderLabel="Photo coming soon"
              containerClassName="bg-slate-100"
            />
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              Click to enlarge
            </span>
          </button>
        ) : (
          <StorefrontProductPhoto
            imageS3Key={selectedKey}
            alt={productName}
            aspectClassName="aspect-[4/3]"
            iconClassName="h-14 w-14 sm:h-16 sm:w-16"
            placeholderLabel="Photo coming soon"
            containerClassName="bg-slate-100"
          />
        )}
      </div>
      {keys.length > 1 ? (
        <div
          className="mt-2 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={`${productName} photos`}
        >
          {keys.map((key, index) => {
            const thumbSrc = baseUrl ? buildProductMediaUrl(key, baseUrl) : null
            const isSelected = index === selectedIndex
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Photo ${index + 1} of ${keys.length}`}
                onClick={() => setSelectedIndex(index)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isSelected ? 'border-sky-600' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {thumbSrc ? (
                  <img src={thumbSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="block h-full w-full bg-slate-100" />
                )}
              </button>
            )
          })}
        </div>
      ) : null}

      <PublicProductDetailLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageS3Keys={keys}
        initialIndex={selectedIndex}
        productName={productName}
        onIndexChange={setSelectedIndex}
      />
    </div>
  )
}
