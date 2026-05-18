import { Link } from 'react-router-dom'
import { departmentBrowsePath } from '../../pages/categoryProducts/categoryProductRoutes'
import { StorefrontProductPhoto } from '../product/StorefrontProductPhoto'

type HomeCategoryCardProps = {
  name: string
  slug: string
  imageS3Key?: string | null
}

export function HomeCategoryCard({ name, slug, imageS3Key }: HomeCategoryCardProps) {
  const to = departmentBrowsePath(slug)

  return (
    <Link
      to={to}
      className="group flex h-full min-h-[220px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm outline-none ring-sky-500/40 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200/80 hover:shadow-lg focus-visible:ring-2 active:translate-y-0"
      aria-label={`Browse ${name}`}
    >
      <div className="relative aspect-[5/3] w-full shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <StorefrontProductPhoto
          imageS3Key={imageS3Key}
          alt={name}
          aspectClassName="aspect-[5/3]"
          iconClassName="h-12 w-12 sm:h-14 sm:w-14"
          placeholderLabel="Photo soon"
          containerClassName="bg-gradient-to-br from-slate-50 to-slate-100"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4">
        <p className="line-clamp-2 text-center text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-sky-800">{name}</p>
      </div>
    </Link>
  )
}
