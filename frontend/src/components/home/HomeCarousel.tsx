import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

type HomeCarouselProps = {
  /** Accessible name for the horizontal list (e.g. "Clearance products"). */
  ariaLabel: string
  children: ReactNode
}

export function HomeCarousel({ ariaLabel, children }: HomeCarouselProps) {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [showArrows, setShowArrows] = useState(true)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft < maxScroll - 4)
    setShowArrows(scrollWidth > clientWidth + 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(() => updateScrollState())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState])

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const delta = Math.max(el.clientWidth * 0.85, 280) * direction
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const childArray = Children.toArray(children)

  useEffect(() => {
    updateScrollState()
  }, [childArray.length, updateScrollState])

  return (
    <div className="relative -mx-1">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-3 scroll-pr-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:scroll-pl-4 sm:scroll-pr-4 md:scroll-pl-2 md:scroll-pr-2 [&::-webkit-scrollbar]:hidden"
      >
        {childArray.map((child, i) => (
          <li
            key={i}
            className="w-[min(85vw,20rem)] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]"
          >
            {child}
          </li>
        ))}
      </ul>

      {showArrows ? (
        <>
          <button
            type="button"
            className="pointer-coarse:hidden absolute left-0 top-1/2 z-[1] max-md:hidden -translate-y-1/2 rounded-full border border-slate-200/90 bg-white/95 p-2 text-slate-700 shadow-md backdrop-blur transition hover:border-slate-300 hover:bg-white hover:shadow-lg disabled:pointer-events-none disabled:opacity-25 md:inline-flex"
            aria-label={`Scroll left in ${ariaLabel}`}
            disabled={!canPrev}
            onClick={() => scrollByPage(-1)}
          >
            <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-coarse:hidden absolute right-0 top-1/2 z-[1] max-md:hidden -translate-y-1/2 rounded-full border border-slate-200/90 bg-white/95 p-2 text-slate-700 shadow-md backdrop-blur transition hover:border-slate-300 hover:bg-white hover:shadow-lg disabled:pointer-events-none disabled:opacity-25 md:inline-flex"
            aria-label={`Scroll right in ${ariaLabel}`}
            disabled={!canNext}
            onClick={() => scrollByPage(1)}
          >
            <FiChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  )
}
