export function getNavItemClassName(isActive: boolean) {
  return `shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-base transition sm:px-2.5 ${
    isActive ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-700 hover:text-sky-700'
  }`
}
