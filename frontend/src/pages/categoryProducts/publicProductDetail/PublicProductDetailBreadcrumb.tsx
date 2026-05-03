import { FiChevronRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import type { PublicCategory } from '../../../components/navbar/types'
import { categoryProductsPath, departmentBrowsePath } from '../categoryProductRoutes'

type PublicProductDetailBreadcrumbProps = {
  breadcrumbChain: PublicCategory[]
  decodedLevel1: string
  searchKeyword: string
  productName: string | null
}

export function PublicProductDetailBreadcrumb({
  breadcrumbChain,
  decodedLevel1,
  searchKeyword,
  productName,
}: PublicProductDetailBreadcrumbProps) {
  return (
    <nav className="text-xs text-slate-500 sm:text-sm" aria-label="Breadcrumb">
      <ol className="flex max-w-full flex-wrap items-center gap-x-1 gap-y-1.5 sm:gap-x-1.5">
        <li className="flex min-w-0 shrink-0 items-center">
          <Link
            to="/"
            className="rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
          >
            Home
          </Link>
        </li>
        {breadcrumbChain.map((cat) => {
          const searchSuffix =
            searchKeyword.length > 0 ? `?${new URLSearchParams({ q: searchKeyword }).toString()}` : ''
          const segmentHref =
            cat.level === 1
              ? `${departmentBrowsePath(decodedLevel1)}${searchSuffix}`
              : `${categoryProductsPath(decodedLevel1, cat.slug)}${searchSuffix}`
          return (
            <li key={cat.id} className="flex min-w-0 max-w-full items-center gap-1">
              <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <Link
                to={segmentHref}
                className="min-w-0 truncate rounded-sm text-sky-700 underline-offset-4 outline-none ring-sky-500/40 hover:text-sky-800 hover:underline focus-visible:ring-2"
                title={cat.name}
              >
                {cat.name}
              </Link>
            </li>
          )
        })}
        {productName ? (
          <li className="flex min-w-0 max-w-full items-center gap-1">
            <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="min-w-0 truncate font-medium text-slate-800" title={productName} aria-current="page">
              {productName}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  )
}
