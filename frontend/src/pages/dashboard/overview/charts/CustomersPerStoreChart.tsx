import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { CustomersPerStorePoint } from '../../dashboardTypes'
import { OVERVIEW_CHART_EMPTY_CLASS, OVERVIEW_CHART_HEIGHT } from './overviewChartConstants'
import { OverviewChartCard } from './OverviewChartCard'
import { OVERVIEW_CHART_COLORS } from './overviewChartTheme'

type CustomersPerStoreChartProps = {
  data: CustomersPerStorePoint[]
  isLoading?: boolean
}

function truncateStoreName(name: string, max = 12): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function CustomersPerStoreChart({ data, isLoading = false }: CustomersPerStoreChartProps) {
  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        shortName: truncateStoreName(row.storeName),
      })),
    [data],
  )

  const hasCustomers = data.some((row) => row.uniqueCustomers > 0)
  const storeCount = Math.max(chartData.length, 1)
  const needsAngledLabels = storeCount > 3
  const maxBarSize = Math.max(8, Math.min(24, Math.floor(160 / storeCount)))
  const xAxisHeight = needsAngledLabels ? 44 : 24

  return (
    <OverviewChartCard
      title="Customers by store"
      description="Unique buyers with paid orders in this period (per store)"
      isLoading={isLoading}
    >
      {!isLoading && chartData.length === 0 ? (
        <p className={OVERVIEW_CHART_EMPTY_CLASS}>No store data available.</p>
      ) : !isLoading && !hasCustomers ? (
        <p className={OVERVIEW_CHART_EMPTY_CLASS}>No paying customers in this period yet.</p>
      ) : (
        <div className={`overflow-hidden ${OVERVIEW_CHART_HEIGHT} ${isLoading ? 'opacity-40' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="18%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={OVERVIEW_CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 10, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={xAxisHeight}
                angle={needsAngledLabels ? -28 : 0}
                textAnchor={needsAngledLabels ? 'end' : 'middle'}
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fontSize: 10, fill: OVERVIEW_CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                tickMargin={4}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const label = name === 'uniqueCustomers' ? 'Unique customers' : 'Paid orders'
                  return [value, label]
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as CustomersPerStorePoint | undefined
                  return row?.storeName ?? ''
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: OVERVIEW_CHART_COLORS.tooltipBorder,
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="top"
                height={20}
                iconType="circle"
                wrapperStyle={{ fontSize: 10, color: OVERVIEW_CHART_COLORS.axis }}
              />
              <Bar
                dataKey="uniqueCustomers"
                name="Unique customers"
                fill={OVERVIEW_CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={maxBarSize}
              />
              <Bar
                dataKey="paidOrderCount"
                name="Paid orders"
                fill={OVERVIEW_CHART_COLORS.primaryLight}
                radius={[4, 4, 0, 0]}
                maxBarSize={maxBarSize}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </OverviewChartCard>
  )
}
