import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatAudAmount } from '../../../../components/home/formatAud'
import type { TopProductPoint } from '../../dashboardTypes'
import { OVERVIEW_CHART_EMPTY_CLASS, OVERVIEW_CHART_HEIGHT } from './overviewChartConstants'
import { OverviewChartCard } from './OverviewChartCard'
import { OVERVIEW_CHART_COLORS } from './overviewChartTheme'

type TopProductsChartProps = {
  data: TopProductPoint[]
  currencyCode: string
  isLoading?: boolean
}

function formatRevenue(value: number, currencyCode: string): string {
  if (currencyCode.toUpperCase() === 'AUD') {
    return `A$${formatAudAmount(value)}`
  }
  return `${currencyCode} ${value.toFixed(0)}`
}

function truncateLabel(name: string, max = 28): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function TopProductsChart({ data, currencyCode, isLoading = false }: TopProductsChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    shortName: truncateLabel(item.productName),
  }))

  return (
    <OverviewChartCard
      title="Top products by revenue"
      description="Best sellers from paid orders (top 5)"
      isLoading={isLoading}
    >
      {!isLoading && chartData.length === 0 ? (
        <p className={OVERVIEW_CHART_EMPTY_CLASS}>No product sales in this period yet.</p>
      ) : (
        <div className={`${OVERVIEW_CHART_HEIGHT} ${isLoading ? 'opacity-40' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={OVERVIEW_CHART_COLORS.grid} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatRevenue(value, currencyCode)}
                tick={{ fontSize: 10, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={72}
                tick={{ fontSize: 10, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatRevenue(value, currencyCode), 'Revenue']}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as TopProductPoint | undefined
                  return row?.productName ?? ''
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: OVERVIEW_CHART_COLORS.tooltipBorder,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenue"
                fill={OVERVIEW_CHART_COLORS.primaryLight}
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </OverviewChartCard>
  )
}
