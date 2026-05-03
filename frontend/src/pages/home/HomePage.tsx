import { useEffect, useState } from 'react'
import { HomeCarouselSection, HomeCarouselSkeletonRow } from '../../components/home/HomeCarouselSection'
import { HomeCategoryCard } from '../../components/home/HomeCategoryCard'
import { HomeProductCard, type HomeProductCardModel } from '../../components/home/HomeProductCard'

type PublicCategoryRow = {
  id: string
  parentId: string | null
  name: string
  slug: string
  level: number
}

type SpotlightResponse = {
  items?: HomeProductCardModel[]
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load data (server returned a non-JSON page). Run the API on port 5080 and restart the dev server so /api is proxied.',
    )
  }
  return (await response.json()) as T
}

async function fetchApiJson<T>(path: string): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`
  let res = await fetch(`${apiBaseUrl}${p}`)
  if (!res.ok) {
    res = await fetch(p)
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}).`)
  }
  return readJsonResponse<T>(res)
}

export default function HomePage() {
  const [level1Categories, setLevel1Categories] = useState<PublicCategoryRow[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [errorCategories, setErrorCategories] = useState<string | null>(null)

  const [clearance, setClearance] = useState<HomeProductCardModel[]>([])
  const [loadingClearance, setLoadingClearance] = useState(true)
  const [errorClearance, setErrorClearance] = useState<string | null>(null)

  const [topSelling, setTopSelling] = useState<HomeProductCardModel[]>([])
  const [loadingTop, setLoadingTop] = useState(true)
  const [errorTop, setErrorTop] = useState<string | null>(null)

  const [newArrivals, setNewArrivals] = useState<HomeProductCardModel[]>([])
  const [loadingNew, setLoadingNew] = useState(true)
  const [errorNew, setErrorNew] = useState<string | null>(null)

  const [refurbished, setRefurbished] = useState<HomeProductCardModel[]>([])
  const [loadingRefurb, setLoadingRefurb] = useState(true)
  const [errorRefurb, setErrorRefurb] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const run = async () => {
      try {
        const data = await fetchApiJson<{ items?: PublicCategoryRow[] }>('/api/categories/public')
        if (!alive) return
        const items = data.items ?? []
        setLevel1Categories(items.filter((c) => c.level === 1).sort((a, b) => a.name.localeCompare(b.name)))
        setErrorCategories(null)
      } catch (e) {
        if (!alive) return
        setLevel1Categories([])
        setErrorCategories(e instanceof Error ? e.message : 'Unable to load categories.')
      } finally {
        if (alive) setLoadingCategories(false)
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const data = await fetchApiJson<SpotlightResponse>('/api/products/public/clearance?take=10')
        if (!alive) return
        setClearance(data.items ?? [])
        setErrorClearance(null)
      } catch (e) {
        if (!alive) return
        setClearance([])
        setErrorClearance(e instanceof Error ? e.message : 'Unable to load clearance products.')
      } finally {
        if (alive) setLoadingClearance(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const data = await fetchApiJson<SpotlightResponse>('/api/products/public/top-selling?take=10')
        if (!alive) return
        setTopSelling(data.items ?? [])
        setErrorTop(null)
      } catch (e) {
        if (!alive) return
        setTopSelling([])
        setErrorTop(e instanceof Error ? e.message : 'Unable to load top selling products.')
      } finally {
        if (alive) setLoadingTop(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const data = await fetchApiJson<SpotlightResponse>('/api/products/public/new-arrivals?take=10')
        if (!alive) return
        setNewArrivals(data.items ?? [])
        setErrorNew(null)
      } catch (e) {
        if (!alive) return
        setNewArrivals([])
        setErrorNew(e instanceof Error ? e.message : 'Unable to load new arrivals.')
      } finally {
        if (alive) setLoadingNew(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const data = await fetchApiJson<SpotlightResponse>('/api/products/public/refurbished?take=10')
        if (!alive) return
        setRefurbished(data.items ?? [])
        setErrorRefurb(null)
      } catch (e) {
        if (!alive) return
        setRefurbished([])
        setErrorRefurb(e instanceof Error ? e.message : 'Unable to load refurbished products.')
      } finally {
        if (alive) setLoadingRefurb(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-white to-slate-50/90">
      <div className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
        <main className="mx-auto w-full max-w-7xl py-6 md:py-10">
          <h1 className="sr-only">Home</h1>

          <div className="flex flex-col gap-8 md:gap-10">
            <HomeCarouselSection
              title="Discover our categories"
              subtitle="Start from a top-level department, then narrow down as you shop."
              sectionId="home-discover-categories"
              carouselAriaLabel="Category carousel"
              isLoading={loadingCategories}
              error={errorCategories}
              isEmpty={!loadingCategories && level1Categories.length === 0}
              emptyMessage="No categories yet. Check back soon."
              skeleton={<HomeCarouselSkeletonRow count={5} />}
            >
              {level1Categories.map((c) => (
                <HomeCategoryCard key={c.id} name={c.name} slug={c.slug} />
              ))}
            </HomeCarouselSection>

            <HomeCarouselSection
              title="Clearance"
              subtitle="Strong prices on selected items while stock lasts."
              sectionId="home-clearance"
              carouselAriaLabel="Clearance products"
              isLoading={loadingClearance}
              error={errorClearance}
              isEmpty={!loadingClearance && clearance.length === 0}
              emptyMessage="No clearance products yet."
              skeleton={<HomeCarouselSkeletonRow productStyle count={5} />}
            >
              {clearance.map((p) => (
                <HomeProductCard key={p.id} product={p} />
              ))}
            </HomeCarouselSection>

            <HomeCarouselSection
              title="Top selling"
              subtitle="Popular choices from shoppers right now."
              sectionId="home-top-selling"
              carouselAriaLabel="Top selling products"
              isLoading={loadingTop}
              error={errorTop}
              isEmpty={!loadingTop && topSelling.length === 0}
              emptyMessage="No products to show yet."
              skeleton={<HomeCarouselSkeletonRow productStyle count={5} />}
            >
              {topSelling.map((p) => (
                <HomeProductCard key={p.id} product={p} />
              ))}
            </HomeCarouselSection>

            <HomeCarouselSection
              title="New arrivals"
              subtitle="Fresh listings recently added to the catalog."
              sectionId="home-new-arrival"
              carouselAriaLabel="New arrival products"
              isLoading={loadingNew}
              error={errorNew}
              isEmpty={!loadingNew && newArrivals.length === 0}
              emptyMessage="No new arrivals yet."
              skeleton={<HomeCarouselSkeletonRow productStyle count={5} />}
            >
              {newArrivals.map((p) => (
                <HomeProductCard key={p.id} product={p} />
              ))}
            </HomeCarouselSection>

            <HomeCarouselSection
              title="Refurbished"
              subtitle="Renewed items ready for their next home."
              sectionId="home-refurbished"
              carouselAriaLabel="Refurbished products"
              isLoading={loadingRefurb}
              error={errorRefurb}
              isEmpty={!loadingRefurb && refurbished.length === 0}
              emptyMessage="No refurbished products yet."
              skeleton={<HomeCarouselSkeletonRow productStyle count={5} />}
            >
              {refurbished.map((p) => (
                <HomeProductCard key={p.id} product={p} />
              ))}
            </HomeCarouselSection>
          </div>
        </main>
      </div>
    </div>
  )
}
