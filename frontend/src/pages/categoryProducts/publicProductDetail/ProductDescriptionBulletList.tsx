import type { IconType } from 'react-icons'
import { FiCheck, FiCpu, FiHardDrive, FiLayers, FiMonitor, FiPackage, FiWifi } from 'react-icons/fi'

/** Rotating accent icons for each description line (readable bullet list). */
const DESCRIPTION_LINE_ICONS: IconType[] = [
  FiPackage,
  FiCpu,
  FiMonitor,
  FiHardDrive,
  FiWifi,
  FiLayers,
  FiCheck,
]

type ProductDescriptionBulletListProps = {
  text: string
}

export function ProductDescriptionBulletList({ text }: ProductDescriptionBulletListProps) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return null

  return (
    <ul className="mt-3 space-y-3">
      {lines.map((line, index) => {
        const Icon = DESCRIPTION_LINE_ICONS[index % DESCRIPTION_LINE_ICONS.length]
        return (
          <li key={`desc-${index}-${line.slice(0, 24)}`} className="flex gap-3 text-sm leading-relaxed text-slate-700">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 pt-0.5">{line}</span>
          </li>
        )
      })}
    </ul>
  )
}
