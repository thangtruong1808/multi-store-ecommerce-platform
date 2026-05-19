export const OVERVIEW_CHART_COLORS = {
  primary: '#0284c7',
  primaryLight: '#38bdf8',
  paid: '#059669',
  pending: '#d97706',
  failed: '#dc2626',
  cancelled: '#64748b',
  grid: '#e2e8f0',
  axis: '#64748b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
} as const

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  succeeded: OVERVIEW_CHART_COLORS.paid,
  pending: OVERVIEW_CHART_COLORS.pending,
  failed: OVERVIEW_CHART_COLORS.failed,
  canceled: OVERVIEW_CHART_COLORS.cancelled,
  cancelled: OVERVIEW_CHART_COLORS.cancelled,
}

export function paymentStatusColor(status: string): string {
  return PAYMENT_STATUS_COLORS[status.toLowerCase()] ?? OVERVIEW_CHART_COLORS.primary
}
