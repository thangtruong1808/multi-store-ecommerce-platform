import { useEffect, useMemo, useState } from 'react'
import { FiImage } from 'react-icons/fi'

import { buildProductMediaUrl, getConfiguredProductMediaBaseUrl } from '../../utils/productMediaUrl'

type StorefrontProductPhotoProps = {
  imageS3Key?: string | null
  alt: string
  aspectClassName?: string
  iconClassName?: string
  placeholderLabel?: string
  showPlaceholderLabel?: boolean
  containerClassName?: string
}

export function StorefrontProductPhoto({
  imageS3Key,
  alt,
  aspectClassName = 'aspect-[4/3]',
  iconClassName = 'h-10 w-10 sm:h-12 sm:w-12',
  placeholderLabel = 'Photo soon',
  showPlaceholderLabel = true,
  containerClassName = 'bg-slate-100',
}: StorefrontProductPhotoProps) {
  const baseUrl = getConfiguredProductMediaBaseUrl()
  const src = useMemo(() => {
    const key = imageS3Key?.trim()
    if (!key || !baseUrl) return null
    return buildProductMediaUrl(key, baseUrl)
  }, [imageS3Key, baseUrl])

  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imageS3Key])

  const showImage = Boolean(src) && !failed

  return (
    <div className={`relative w-full overflow-hidden ${containerClassName} ${aspectClassName}`}>
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
          <FiImage className={`shrink-0 ${iconClassName}`} aria-hidden="true" />
          {showPlaceholderLabel ? (
            <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">{placeholderLabel}</span>
          ) : (
            <span className="sr-only">No product photo</span>
          )}
        </div>
      )}
    </div>
  )
}

export function resolvePrimaryImageS3Key(
  primaryImageS3Key?: string | null,
  imageS3Keys?: string[] | null,
): string | null {
  const primary = primaryImageS3Key?.trim()
  if (primary) return primary
  const first = imageS3Keys?.find((k) => k.trim().length > 0)?.trim()
  return first ?? null
}
