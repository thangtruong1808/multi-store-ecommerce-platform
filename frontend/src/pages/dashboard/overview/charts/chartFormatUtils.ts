import { formatAudAmount } from '../../../../components/home/formatAud'

export function formatAxisDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Full amount for tooltips and stat cards. */
export function formatMoneyFull(amount: number, currencyCode: string): string {
  if (currencyCode.toUpperCase() === 'AUD') {
    return `A$${formatAudAmount(amount)}`
  }
  return `${currencyCode} ${amount.toFixed(2)}`
}

/** Compact ticks so Y-axis labels are not clipped (e.g. A$1.2k). */
export function formatMoneyCompact(value: number, currencyCode: string): string {
  const abs = Math.abs(value)
  const prefix = currencyCode.toUpperCase() === 'AUD' ? 'A$' : `${currencyCode} `

  if (abs >= 1_000_000) {
    return `${prefix}${(value / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${prefix}${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  }
  if (currencyCode.toUpperCase() === 'AUD') {
    return `${prefix}${Math.round(value)}`
  }
  return `${prefix}${value.toFixed(0)}`
}

export function estimateYAxisWidth(maxValue: number, currencyCode: string): number {
  const sample = formatMoneyCompact(maxValue, currencyCode)
  return Math.min(96, Math.max(48, sample.length * 7 + 12))
}
