/** Australian grouping (e.g. 3,268.00) for display with A$ prefix in callers. */
export function formatAudAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
