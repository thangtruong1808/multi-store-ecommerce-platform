/**
 * Slide widths use % of the scroll container (not vw). Percentages are slightly
 * above an even split (e.g. 2×49.5% > 100%) so multiple items create horizontal
 * overflow and prev/next affordances can appear. Capped at 20rem.
 * Gaps: gap-3 (0.75rem), sm:gap-4 (1rem) — keep in sync with HomeCarousel.
 */
export const HOME_CAROUSEL_SLIDE_CLASS =
  'min-w-0 max-w-full shrink-0 snap-start w-[min(20rem,calc(100%-1.5rem))] sm:w-[min(20rem,49.5%)] md:w-[min(20rem,33.8%)] lg:w-[min(20rem,25.9%)] xl:w-[min(20rem,20.85%)]'
