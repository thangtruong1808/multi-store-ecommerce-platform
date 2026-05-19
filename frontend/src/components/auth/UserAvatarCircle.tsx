import { useCallback, useEffect, useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

type UserAvatarCircleProps = {
  imageUrl: string | null
  initials: string
  sizeClassName?: string
  textClassName?: string
  roundedClassName?: string
  isBusy?: boolean
  ariaLabel?: string
}

function readImageStatus(img: HTMLImageElement | null): 'loading' | 'loaded' | 'failed' {
  if (!img || !img.complete) {
    return 'loading'
  }
  return img.naturalWidth > 0 ? 'loaded' : 'failed'
}

export function UserAvatarCircle({
  imageUrl,
  initials,
  sizeClassName = 'h-8 w-8',
  textClassName = 'text-sm',
  roundedClassName = 'rounded-full',
  isBusy = false,
  ariaLabel,
}: UserAvatarCircleProps) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const applyImageStatus = useCallback((img: HTMLImageElement | null) => {
    const status = readImageStatus(img)
    if (status === 'loaded') {
      setIsImageLoading(false)
      setImageFailed(false)
      return
    }
    if (status === 'failed') {
      setIsImageLoading(false)
      setImageFailed(true)
      return
    }
    setIsImageLoading(true)
    setImageFailed(false)
  }, [])

  useEffect(() => {
    if (!imageUrl) {
      setIsImageLoading(false)
      setImageFailed(false)
      imgRef.current = null
      return
    }

    setIsImageLoading(true)
    setImageFailed(false)
    applyImageStatus(imgRef.current)
  }, [imageUrl, applyImageStatus])

  const handleImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node
      if (!imageUrl) {
        return
      }
      applyImageStatus(node)
    },
    [applyImageStatus, imageUrl],
  )

  const showImage = Boolean(imageUrl) && !imageFailed
  const showSpinner = isBusy || (showImage && isImageLoading)

  return (
    <span
      className={`relative inline-flex ${sizeClassName} shrink-0 items-center justify-center overflow-hidden ${roundedClassName}`}
      aria-label={ariaLabel}
      aria-busy={showSpinner}
    >
      {showImage ? (
        <img
          key={imageUrl}
          ref={handleImgRef}
          src={imageUrl!}
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          onLoad={() => {
            setIsImageLoading(false)
            setImageFailed(false)
          }}
          onError={() => {
            setImageFailed(true)
            setIsImageLoading(false)
          }}
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center bg-sky-600 font-semibold tracking-widest text-white ${textClassName}`}
          aria-hidden={Boolean(ariaLabel)}
        >
          {initials}
        </span>
      )}
      {showSpinner ? (
        <span className="absolute inset-0 flex items-center justify-center bg-white/75" role="status">
          <span className="sr-only">Loading profile photo</span>
          <FiRefreshCw className="h-[38%] w-[38%] min-h-4 min-w-4 animate-spin text-sky-600" aria-hidden="true" />
        </span>
      ) : null}
    </span>
  )
}
