import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import { categoryProductsPath } from '../../pages/categoryProducts/categoryProductRoutes'
import type { PublicCategory } from './types'

type NavbarMegaMenuProps = {
  categories: PublicCategory[]
  /** Level 1 department slug for the open mega menu (e.g. `desktop`). */
  level1Slug: string
  level2Categories: PublicCategory[]
  level3Categories: PublicCategory[]
  activeLevel2Id: string | null
  onMouseEnterPanel: () => void
  onMouseLeavePanel: () => void
  onLevel2Hover: (categoryId: string) => void
  isMegaOpen: boolean
}

export function NavbarMegaMenu({
  categories,
  level1Slug,
  level2Categories,
  level3Categories,
  activeLevel2Id,
  onMouseEnterPanel,
  onMouseLeavePanel,
  onLevel2Hover,
  isMegaOpen,
}: NavbarMegaMenuProps) {
  const departmentSlug = level1Slug.trim() || 'category'
  const activeLevel2 = activeLevel2Id ? level2Categories.find((c) => c.id === activeLevel2Id) : undefined
  const showL3EmptyHint =
    Boolean(activeLevel2Id) && level3Categories.length === 0 && activeLevel2 && !categories.some((item) => item.level === 3 && item.parentId === activeLevel2Id)

  return (
    <div
      className={`absolute left-0 right-0 top-full hidden border-b border-t border-slate-200 bg-white shadow-sm transition lg:block ${isMegaOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onMouseEnter={onMouseEnterPanel}
      onMouseLeave={onMouseLeavePanel}
    >
      <div className="mx-auto w-full max-w-[min(100%,120rem)] px-4 py-5 md:px-6 lg:px-8">
        <div className="flex w-full min-w-0 flex-row items-start">
          {/* Level 2: left rail — full-width rows, scroll when many departments */}
          <div className="min-w-0 shrink-0 border-slate-100 lg:w-[min(100%,15rem)] lg:max-w-[15rem] lg:border-r lg:pr-5 xl:w-[min(100%,17rem)] xl:max-w-[17rem] xl:pr-6">
            <div className="flex max-h-[min(22rem,55vh)] flex-col gap-0.5 overflow-y-auto overscroll-y-contain py-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
              {level2Categories.length > 0 ? (
                level2Categories.map((category) => {
                  const hasLevel3 = categories.some((item) => item.level === 3 && item.parentId === category.id)
                  const isActive = activeLevel2Id === category.id
                  return (
                    <Link
                      key={category.id}
                      to={categoryProductsPath(departmentSlug, category.slug)}
                      onMouseEnter={() => onLevel2Hover(category.id)}
                      className={`flex min-h-[2.25rem] w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm leading-snug text-slate-700 outline-none transition hover:bg-slate-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                        isActive ? 'bg-sky-50 font-medium text-sky-800' : ''
                      }`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="min-w-0 flex-1 break-words">{category.name}</span>
                      {hasLevel3 ? <FiChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> : null}
                    </Link>
                  )
                })
              ) : null}
            </div>
          </div>

          {/* Level 3: fluid columns — common mega-menu link grid */}
          <div className="min-h-[min(12rem,30vh)] min-w-0 flex-1 lg:pl-5 xl:pl-6">
            {level3Categories.length > 0 ? (
              <div className="grid max-h-[min(22rem,55vh)] auto-rows-min grid-cols-1 gap-x-8 gap-y-1 overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:thin] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                {level3Categories.map((category) => (
                  <Link
                    key={category.id}
                    to={categoryProductsPath(departmentSlug, category.slug)}
                    className="block rounded-md px-1 py-1.5 text-sm leading-snug text-slate-700 outline-none transition hover:bg-slate-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  >
                    <span className="break-words">{category.name}</span>
                  </Link>
                ))}
              </div>
            ) : showL3EmptyHint ? (
              <p className="px-1 py-2 text-sm text-slate-500">{`No further subcategories for "${activeLevel2?.name}".`}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
