import { Children, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

import { HOME_CAROUSEL_SLIDE_CLASS } from './homeCarouselSlideClasses'

type HomeCarouselProps = {
  /** Accessible name for the horizontal list (e.g. "Clearance products"). */
  ariaLabel: string
  children: ReactNode
}

function measureOverflow(el: HTMLElement): boolean {
  const sw = Math.ceil(el.scrollWidth)
  const cw = Math.floor(el.clientWidth)
  return sw > cw + 2
}

const navBtnClass =
  'absolute top-1/2 z-[2] inline-flex -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition hover:border-slate-300 hover:bg-white hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-30 ' +
  'h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:min-h-0 sm:min-w-0 sm:w-9'

export function HomeCarousel({ ariaLabel, children }: HomeCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [showArrows, setShowArrows] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflowing = measureOverflow(el)
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    setShowArrows(overflowing)
    setCanPrev(scrollLeft > 2)
    setCanNext(scrollLeft < maxScroll - 2)
  }, [])

  const scheduleMeasure = useCallback(() => {
    requestAnimationFrame(() => {
      updateScrollState()
    })
  }, [updateScrollState])

  useLayoutEffect(() => {
    scheduleMeasure()
  }, [scheduleMeasure])

  useEffect(() => {
    const el = scrollerRef.current
    const root = rootRef.current
    if (!el) return

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', scheduleMeasure)

    const ro = new ResizeObserver(() => scheduleMeasure())
    ro.observe(el)
    if (root) {
      ro.observe(root)
    }

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', scheduleMeasure)
      ro.disconnect()
    }
  }, [scheduleMeasure, updateScrollState])

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const delta = Math.max(el.clientWidth * 0.75, 240) * direction
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const childArray = Children.toArray(children)

  useEffect(() => {
    scheduleMeasure()
  }, [childArray.length, scheduleMeasure])

  return (
    <div ref={rootRef} className="relative min-w-0 w-full max-w-full">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label={ariaLabel}
        className="flex min-w-0 w-full max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-10 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-8 md:scroll-pl-2 md:scroll-pr-2 [&::-webkit-scrollbar]:hidden"
      >
        {childArray.map((child, i) => (
          <li key={i} className={HOME_CAROUSEL_SLIDE_CLASS}>
            {child}
          </li>
        ))}
      </ul>

      {showArrows && childArray.length > 0 ? (
        <>
          <button
            type="button"
            className={`${navBtnClass} left-1`}
            aria-label={`Scroll left in ${ariaLabel}`}
            disabled={!canPrev}
            onClick={() => scrollByPage(-1)}
          >
            <FiChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${navBtnClass} right-1`}
            aria-label={`Scroll right in ${ariaLabel}`}
            disabled={!canNext}
            onClick={() => scrollByPage(1)}
          >
            <FiChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  )
}
