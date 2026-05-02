import { FiSearch } from 'react-icons/fi'

const searchFieldClassName =
  'min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'

type NavbarSearchControlProps = {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSubmit: () => void
  isSearchSubmitting: boolean
}

export function NavbarSearchControl({ searchInput, onSearchInputChange, onSubmit, isSearchSubmitting }: NavbarSearchControlProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <FiSearch className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <input
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onSubmit()
          }
        }}
        placeholder="Enter product name"
        className={searchFieldClassName}
        aria-label="Search products"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
        aria-busy={isSearchSubmitting}
      >
        {isSearchSubmitting ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-white" aria-hidden="true" />
        ) : null}
        Search
      </button>
    </div>
  )
}
