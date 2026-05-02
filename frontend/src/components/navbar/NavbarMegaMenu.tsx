import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import type { PublicCategory } from './types'

type NavbarMegaMenuProps = {
  categories: PublicCategory[]
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
  level2Categories,
  level3Categories,
  activeLevel2Id,
  onMouseEnterPanel,
  onMouseLeavePanel,
  onLevel2Hover,
  isMegaOpen,
}: NavbarMegaMenuProps) {
  return (
    <div
      className={`absolute left-0 right-0 top-full hidden border-b border-t border-slate-200 bg-white shadow-sm transition lg:block ${isMegaOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onMouseEnter={onMouseEnterPanel}
      onMouseLeave={onMouseLeavePanel}
    >
      <div className="w-full px-4 py-5 md:px-6 lg:px-8">
        <div className="grid w-full grid-cols-4 gap-6">
          <div>
            <div className="space-y-1">
              {level2Categories.length > 0 ? (
                level2Categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/?categoryId=${encodeURIComponent(category.id)}`}
                    onMouseEnter={() => onLevel2Hover(category.id)}
                    className={`inline-flex items-center gap-1.5 px-1 py-1 text-sm text-slate-700 transition hover:text-sky-700 ${
                      activeLevel2Id === category.id ? 'font-semibold' : ''
                    }`}
                  >
                    <span>{category.name}</span>
                    {categories.some((item) => item.level === 3 && item.parentId === category.id) ? (
                      <FiChevronRight className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </Link>
                ))
              ) : null}
            </div>
          </div>
          <div className="col-span-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {level3Categories.length > 0 ? (
                level3Categories.map((category) => (
                  <Link key={category.id} to={`/?categoryId=${encodeURIComponent(category.id)}`} className="px-1 py-1 text-sm text-slate-700 transition hover:text-sky-700">
                    {category.name}
                  </Link>
                ))
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
