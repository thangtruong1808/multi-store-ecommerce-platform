import { formatAudAmount } from '../../components/home/formatAud'
import { DashboardSpinner } from './DashboardSpinner'
import { CustomersPerStoreChart } from './overview/charts/CustomersPerStoreChart'
import { PaymentStatusChart } from './overview/charts/PaymentStatusChart'
import { RevenueTrendChart } from './overview/charts/RevenueTrendChart'
import { TopProductsChart } from './overview/charts/TopProductsChart'
import type { DashboardStatistics, ManagedStoreOption } from './dashboardTypes'
import type { OverviewPeriodDays, OverviewStoreFilter } from './hooks/useDashboardOverviewBlock'

type StatCardProps = {
  label: string
  value: string
  hint: string
  isLoading?: boolean
}

function StatCard({ label, value, hint, isLoading = false }: StatCardProps) {
  return (
    <div
      className={`flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${isLoading ? 'animate-pulse' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-1.5 h-7 rounded bg-slate-100" aria-hidden="true" />
      ) : (
        <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      )}
      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}

function formatMoney(amount: number, currencyCode: string): string {
  if (currencyCode.toUpperCase() === 'AUD') {
    return `A$${formatAudAmount(amount)}`
  }
  return `${currencyCode} ${amount.toFixed(2)}`
}

const PLACEHOLDER_CARDS: StatCardProps[] = [
  { label: 'Paid revenue', value: '—', hint: 'Loading…' },
  { label: 'Total orders', value: '—', hint: 'Loading…' },
  { label: 'Unique customers', value: '—', hint: 'Loading…' },
  { label: 'Paid orders', value: '—', hint: 'Loading…' },
  { label: 'Pending payment', value: '—', hint: 'Loading…' },
  { label: 'Average order value', value: '—', hint: 'Loading…' },
  { label: 'Active products', value: '—', hint: 'Loading…' },
  { label: 'Low stock items', value: '—', hint: 'Loading…' },
]

type DashboardOverviewHomeProps = {
  statistics: DashboardStatistics | null
  isStatisticsLoading: boolean
  isAdminSession: boolean
  managedStores: ManagedStoreOption[]
  storeLocationLabel: string
  selectedStoreId: OverviewStoreFilter
  setSelectedStoreId: (value: OverviewStoreFilter) => void
  selectedPeriodDays: OverviewPeriodDays
  setSelectedPeriodDays: (value: OverviewPeriodDays) => void
  periodOptions: readonly OverviewPeriodDays[]
}

export function DashboardOverviewHome({
  statistics,
  isStatisticsLoading,
  isAdminSession,
  managedStores,
  storeLocationLabel,
  selectedStoreId,
  setSelectedStoreId,
  selectedPeriodDays,
  setSelectedPeriodDays,
  periodOptions,
}: DashboardOverviewHomeProps) {
  const currencyCode = statistics?.currencyCode ?? 'AUD'
  const periodLabel = `Last ${selectedPeriodDays} days`
  const showSkeleton = isStatisticsLoading && !statistics

  const cards: StatCardProps[] = statistics
    ? [
        {
          label: 'Paid revenue',
          value: formatMoney(statistics.revenuePaid, currencyCode),
          hint: `${periodLabel} · successful payments`,
        },
        {
          label: 'Total orders',
          value: String(statistics.orderCount),
          hint: `${periodLabel} · all payment states`,
        },
        {
          label: 'Unique customers',
          value: String(statistics.uniqueCustomersTotal),
          hint: `${periodLabel} · paid orders only`,
        },
        {
          label: 'Paid orders',
          value: String(statistics.paidOrderCount),
          hint: 'Checkout completed',
        },
        {
          label: 'Pending payment',
          value: String(statistics.pendingPaymentCount),
          hint: 'Awaiting payment',
        },
        {
          label: 'Average order value',
          value: formatMoney(statistics.averageOrderValue, currencyCode),
          hint: 'Based on paid orders',
        },
        {
          label: 'Active products',
          value: String(statistics.activeProductCount),
          hint: 'Visible in catalog',
        },
        {
          label: 'Low stock items',
          value: String(statistics.lowStockCount),
          hint: 'Quantity at 5 or below',
        },
      ]
    : PLACEHOLDER_CARDS

  const emptyRevenueSeries = Array.from({ length: selectedPeriodDays }, (_, index) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - (selectedPeriodDays - 1 - index))
    return {
      date: date.toISOString().slice(0, 10),
      revenue: 0,
      orderCount: 0,
    }
  })

  return (
    <div className="relative">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Period
            <select
              value={selectedPeriodDays}
              onChange={(e) => setSelectedPeriodDays(Number(e.target.value) as OverviewPeriodDays)}
              disabled={isStatisticsLoading}
              className="min-h-[36px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
            >
              {periodOptions.map((days) => (
                <option key={days} value={days}>
                  Last {days} days
                </option>
              ))}
            </select>
          </label>

          {isAdminSession ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Store
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value as OverviewStoreFilter)}
                disabled={isStatisticsLoading}
                className="min-h-[36px] min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
              >
                <option value="all">All stores</option>
                {managedStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-700">Your stores:</span> {storeLocationLabel}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statistics?.storeName ? (
            <p className="text-sm text-slate-500">
              Showing: <span className="font-medium text-slate-700">{statistics.storeName}</span>
            </p>
          ) : null}
          {isStatisticsLoading ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-slate-600"
              role="status"
              aria-live="polite"
            >
              <DashboardSpinner className="h-3.5 w-3.5" />
              {showSkeleton ? 'Loading statistics…' : 'Updating…'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} isLoading={showSkeleton} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <RevenueTrendChart
          data={statistics?.revenueByDay ?? emptyRevenueSeries}
          currencyCode={currencyCode}
          isLoading={isStatisticsLoading}
        />
        <PaymentStatusChart data={statistics?.paymentStatusBreakdown ?? []} isLoading={isStatisticsLoading} />
        <TopProductsChart
          data={statistics?.topProducts ?? []}
          currencyCode={currencyCode}
          isLoading={isStatisticsLoading}
        />
        <CustomersPerStoreChart
          data={statistics?.customersPerStore ?? []}
          isLoading={isStatisticsLoading}
        />
      </div>
    </div>
  )
}
