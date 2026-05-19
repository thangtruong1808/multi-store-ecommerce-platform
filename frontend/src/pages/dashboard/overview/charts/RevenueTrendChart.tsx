import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { RevenueByDayPoint } from '../../dashboardTypes'
import {
  estimateYAxisWidth,
  formatAxisDate,
  formatMoneyCompact,
  formatMoneyFull,
} from './chartFormatUtils'
import { OVERVIEW_CHART_EMPTY_CLASS, OVERVIEW_CHART_HEIGHT } from './overviewChartConstants'
import { OverviewChartCard } from './OverviewChartCard'
import { OVERVIEW_CHART_COLORS } from './overviewChartTheme'

type RevenueTrendChartProps = {
  data: RevenueByDayPoint[]
  currencyCode: string
  isLoading?: boolean
}

export function RevenueTrendChart({ data, currencyCode, isLoading = false }: RevenueTrendChartProps) {
  const hasRevenue = data.some((point) => point.revenue > 0)
  const maxRevenue = useMemo(() => data.reduce((max, point) => Math.max(max, point.revenue), 0), [data])
  const yAxisWidth = useMemo(() => estimateYAxisWidth(maxRevenue, currencyCode), [maxRevenue, currencyCode])

  return (
    <OverviewChartCard
      title="Revenue trend"
      description="Paid revenue per day in the selected period"
      isLoading={isLoading}
    >
      {!isLoading && !hasRevenue ? (
        <p className={OVERVIEW_CHART_EMPTY_CLASS}>No paid orders in this period yet.</p>
      ) : (
        <div className={`${OVERVIEW_CHART_HEIGHT} ${isLoading ? 'opacity-40' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={OVERVIEW_CHART_COLORS.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={OVERVIEW_CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={OVERVIEW_CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fontSize: 11, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
                dy={4}
              />
              <YAxis
                tickFormatter={(value: number) => formatMoneyCompact(value, currencyCode)}
                tick={{ fontSize: 11, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
                tickMargin={6}
              />
              <Tooltip
                formatter={(value: number) => [formatMoneyFull(value, currencyCode), 'Revenue']}
                labelFormatter={(label) => formatAxisDate(String(label))}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: OVERVIEW_CHART_COLORS.tooltipBorder,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={OVERVIEW_CHART_COLORS.primary}
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </OverviewChartCard>
  )
}
