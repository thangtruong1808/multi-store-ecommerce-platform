import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'

import { buildProductMediaUrl, getConfiguredProductMediaBaseUrl } from '../../../utils/productMediaUrl'

type PublicProductDetailLightboxProps = {
  isOpen: boolean
  onClose: () => void
  imageS3Keys: string[]
  initialIndex: number
  productName: string
  onIndexChange?: (index: number) => void
}

export function PublicProductDetailLightbox({
  isOpen,
  onClose,
  imageS3Keys,
  initialIndex,
  productName,
  onIndexChange,
}: PublicProductDetailLightboxProps) {
  const keys = imageS3Keys.map((k) => k.trim()).filter((k) => k.length > 0)
  const baseUrl = getConfiguredProductMediaBaseUrl()
  const [index, setIndex] = useState(initialIndex)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const touchStartX = useRef<number | null>(null)

  const clampedIndex = keys.length > 0 ? Math.min(Math.max(index, 0), keys.length - 1) : 0
  const currentKey = keys[clampedIndex] ?? null
  const currentSrc = currentKey && baseUrl ? buildProductMediaUrl(currentKey, baseUrl) : null
  const hasMultiple = keys.length > 1

  const goTo = useCallback(
    (nextIndex: number) => {
      if (keys.length === 0) return
      const wrapped = (nextIndex + keys.length) % keys.length
      setIndex(wrapped)
      setIsImageLoading(true)
      onIndexChange?.(wrapped)
    },
    [keys.length, onIndexChange],
  )

  const goPrev = useCallback(() => goTo(clampedIndex - 1), [clampedIndex, goTo])
  const goNext = useCallback(() => goTo(clampedIndex + 1), [clampedIndex, goTo])

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex)
      setIsImageLoading(true)
    }
  }, [isOpen, initialIndex])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft' && hasMultiple) {
        event.preventDefault()
        goPrev()
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, hasMultiple, goPrev, goNext, onClose])

  if (!isOpen || !currentSrc) {
    return null
  }

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return
    const endX = event.changedTouches[0]?.clientX
    if (endX === undefined) return
    const delta = endX - touchStartX.current
    if (Math.abs(delta) >= 48) {
      if (delta > 0) goPrev()
      else goNext()
    }
    touchStartX.current = null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} photo viewer`}
      aria-busy={isImageLoading}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85"
        aria-label="Close photo viewer"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-white/90">
            {productName}
            {hasMultiple ? (
              <span className="ml-2 tabular-nums text-white/70">
                {clampedIndex + 1} / {keys.length}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close photo viewer"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div
          className="relative mt-2 flex min-h-0 flex-1 items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasMultiple ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                goPrev()
              }}
              className="absolute left-0 z-20 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-2"
              aria-label="Previous photo"
            >
              <FiChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </button>
          ) : null}

          <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center px-10 sm:px-14">
            {isImageLoading ? (
              <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <span className="sr-only">Loading photo</span>
                <span
                  className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
              </span>
            ) : null}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={`${productName} — photo ${clampedIndex + 1} of ${keys.length}`}
              className={`max-h-[min(78vh,720px)] w-auto max-w-full object-contain transition-opacity duration-200 ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              draggable={false}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </div>

          {hasMultiple ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                goNext()
              }}
              className="absolute right-0 z-20 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-2"
              aria-label="Next photo"
            >
              <FiChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
