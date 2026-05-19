import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { PaymentStatusSlice } from '../../dashboardTypes'
import { OVERVIEW_CHART_EMPTY_CLASS, OVERVIEW_CHART_HEIGHT } from './overviewChartConstants'
import { OverviewChartCard } from './OverviewChartCard'
import { OVERVIEW_CHART_COLORS, paymentStatusColor } from './overviewChartTheme'

type PaymentStatusChartProps = {
  data: PaymentStatusSlice[]
  isLoading?: boolean
}

export function PaymentStatusChart({ data, isLoading = false }: PaymentStatusChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0)
  const chartData = data.map((slice) => ({
    name: slice.label,
    value: slice.count,
    status: slice.status,
  }))

  return (
    <OverviewChartCard
      title="Orders by payment status"
      description="How orders in this period are paying"
      isLoading={isLoading}
    >
      {!isLoading && total === 0 ? (
        <p className={OVERVIEW_CHART_EMPTY_CLASS}>No orders in this period yet.</p>
      ) : (
        <div className={`${OVERVIEW_CHART_HEIGHT} ${isLoading ? 'opacity-40' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="72%"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={paymentStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const payload = item.payload as { name: string }
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0
                  return [`${value} (${pct}%)`, payload.name]
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: OVERVIEW_CHART_COLORS.tooltipBorder,
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: OVERVIEW_CHART_COLORS.axis }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </OverviewChartCard>
  )
}
