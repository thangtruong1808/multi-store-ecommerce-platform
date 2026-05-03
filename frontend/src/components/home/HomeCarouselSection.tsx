import type { ReactNode } from 'react'
import { FiAlertCircle, FiInbox } from 'react-icons/fi'
import { HomeCarousel } from './HomeCarousel'

type HomeCarouselSectionProps = {
  /** Visible heading (also drives sr-only context). */
  title: string
  /** Optional short line under the title for context. */
  subtitle?: string
  /** Stable id for `aria-labelledby`. */
  sectionId: string
  /** Passed to the carousel list `aria-label`. */
  carouselAriaLabel: string
  isLoading: boolean
  error: string | null
  isEmpty: boolean
  emptyMessage?: string
  /** Skeleton cards shown while `isLoading`. */
  skeleton: ReactNode
  /** Cards when loaded successfully with items. */
  children: ReactNode
}

export function HomeCarouselSection({
  title,
  subtitle,
  sectionId,
  carouselAriaLabel,
  isLoading,
  error,
  isEmpty,
  emptyMessage = 'No items yet.',
  skeleton,
  children,
}: HomeCarouselSectionProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:p-5 md:p-6"
      aria-labelledby={sectionId}
    >
      <div className="space-y-5">
        <header className="space-y-2 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-3">
                <span
                  className="hidden h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500 sm:block"
                  aria-hidden="true"
                />
                <h2 id={sectionId} className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {title}
                </h2>
              </div>
              {subtitle ? (
                <p className="max-w-prose pl-0 text-sm leading-relaxed text-slate-600 sm:pl-4">{subtitle}</p>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <div
            className="flex gap-3 rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-900"
            role="alert"
          >
            <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            <span className="min-w-0 leading-relaxed">{error}</span>
          </div>
        ) : null}

        {!error && isLoading ? (
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-3 scroll-pr-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:scroll-pl-4 sm:scroll-pr-4 [&::-webkit-scrollbar]:hidden">
            {skeleton}
          </div>
        ) : null}

        {!error && !isLoading && isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center sm:py-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FiInbox className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">{emptyMessage}</p>
          </div>
        ) : null}

        {!error && !isLoading && !isEmpty ? <HomeCarousel ariaLabel={carouselAriaLabel}>{children}</HomeCarousel> : null}
      </div>
    </section>
  )
}

function HomeCarouselSkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div
      className={`w-[min(85vw,20rem)] shrink-0 snap-start animate-pulse sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)] ${tall ? 'min-h-[280px]' : 'min-h-[220px]'}`}
    >
      <div className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${tall ? 'min-h-[280px]' : 'min-h-[220px]'}`}>
        <div className="aspect-[5/3] w-full bg-slate-200" />
        <div className="space-y-2 p-4">
          <div className="h-4 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-200" />
          {!tall ? null : (
            <>
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-5 w-1/4 rounded bg-slate-200" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function HomeCarouselSkeletonRow({ productStyle, count = 5 }: { productStyle?: boolean; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <HomeCarouselSkeletonCard key={i} tall={productStyle} />
      ))}
    </>
  )
}
