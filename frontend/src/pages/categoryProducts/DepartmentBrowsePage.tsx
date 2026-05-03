import { useEffect, useMemo, useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { PublicCategory } from '../../components/navbar/types'
import { getLevel2ByParent, getLevel3ByParent } from '../../components/navbar/categoryTree'
import { categoryProductsPath } from './categoryProductRoutes'

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load categories (server returned a non-JSON page). Run the API on port 5080 and restart the dev server so /api is proxied.',
    )
  }
  return (await response.json()) as T
}

/** Lists level-2 and level-3 categories for a department — same catalog scope as the navbar mega menu. */
export function DepartmentBrowsePage() {
  const { level1Slug = '' } = useParams<{ level1Slug: string }>()
  const [searchParams] = useSearchParams()
  const searchKeyword = searchParams.get('q')?.trim() ?? ''

  const decodedLevel1 = useMemo(() => safeDecode(level1Slug), [level1Slug])

  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

  useEffect(() => {
    if (!decodedLevel1) {
      setCategories([])
      setError('Invalid department link.')
      setIsLoading(false)
      return
    }

    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        let res = await fetch(`${apiBaseUrl}/api/categories/public`)
        if (!res.ok) {
          res = await fetch('/api/categories/public')
        }
        if (!res.ok) throw new Error('Unable to load categories.')
        const payload = await readJsonResponse<{ items?: PublicCategory[] }>(res)
        if (!isMounted) return
        setCategories(payload.items ?? [])
      } catch (e) {
        if (!isMounted) return
        setCategories([])
        setError(e instanceof Error ? e.message : 'Unable to load categories.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, decodedLevel1])

  const level1Category = useMemo(() => {
    const l = decodedLevel1.toLowerCase()
    return categories.find((c) => c.level === 1 && c.slug.toLowerCase() === l)
  }, [categories, decodedLevel1])

  const level2Categories = useMemo(() => {
    if (!level1Category) return []
    return getLevel2ByParent(categories, level1Category.id).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
  }, [categories, level1Category])

  const searchSuffix =
    searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''

  const pageTitle = level1Category?.name ?? (decodedLevel1 || 'Department')

  return (
    <div className="mx-auto w-full max-w-[min(100%,120rem)] px-4 md:px-6 xl:px-8">
      <div className="mx-auto w-full max-w-7xl py-6 md:py-8">
        <h1 className="sr-only">{searchKeyword ? `${pageTitle} — search: ${searchKeyword}` : pageTitle}</h1>
        <nav className="text-xs text-slate-500 sm:text-sm" aria-label="Breadcrumb">
          <ol className="flex max-w-full flex-wrap items-center gap-x-1 gap-y-1.5 sm:gap-x-1.5">
            <li className="flex min-w-0 shrink-0 items-center">
              <Link
                to={searchKeyword ? `/?${new URLSearchParams({ q: searchKeyword }).toString()}` : '/'}
                className="rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
              >
                Home
              </Link>
            </li>
            <li className="flex min-w-0 max-w-full items-center gap-1">
              <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 truncate font-medium text-slate-800" aria-current="page">
                {pageTitle}
              </span>
            </li>
          </ol>
        </nav>

        {error ? (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {!error && isLoading ? (
          <p className="mt-8 text-sm text-slate-500" aria-busy="true">
            Loading categories…
          </p>
        ) : null}

        {!error && !isLoading && !level1Category ? (
          <p className="mt-8 text-sm text-slate-500">Department not found.</p>
        ) : null}

        {!error && !isLoading && level1Category && level2Categories.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No subcategories in this department yet.</p>
        ) : null}

        {!error && !isLoading && level2Categories.length > 0 ? (
          <div className="mt-8 space-y-10">
            {level2Categories.map((l2) => {
              const l3List = getLevel3ByParent(categories, l2.id).sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
              )
              const l2Href = `${categoryProductsPath(decodedLevel1, l2.slug)}${searchSuffix}`
              return (
                <section key={l2.id} aria-labelledby={`dept-l2-${l2.id}`}>
                  <h2 id={`dept-l2-${l2.id}`} className="text-base font-semibold text-slate-900 sm:text-lg">
                    <Link
                      to={l2Href}
                      className="rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
                    >
                      {l2.name}
                    </Link>
                  </h2>
                  {l3List.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6">
                      {l3List.map((l3) => (
                        <li key={l3.id}>
                          <Link
                            to={`${categoryProductsPath(decodedLevel1, l3.slug)}${searchSuffix}`}
                            className="text-sm text-slate-700 underline-offset-4 hover:text-sky-700 hover:underline"
                          >
                            {l3.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Browse all products in this category using the link above.</p>
                  )}
                </section>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
